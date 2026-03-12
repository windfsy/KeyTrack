import { Plugin, TFile, MarkdownRenderChild, MarkdownPostProcessorContext, Component } from 'obsidian';
import { KeyTrackSettings, DEFAULT_SETTINGS, KeyTrackSettingTab } from './settings';

// 代码块参数接口
interface KeyTrackParams {
  queryKey: string;
  previewLength: number;
  maxResults: number;
  pathMode: 'auto' | 'daily' | 'custom';
  customGlob: string;
  firstColumnType: 'auto' | 'date' | 'filename' | 'path' | 'custom';
  customColumnText: string;
  searchFolder: string;
  excludePatterns: string[];
  showAlias: boolean;
  groupByFile: boolean;
  removeMarkdown: boolean;
}

// 匹配结果接口
interface MatchResult {
  file: TFile;
  dateObj: DateObj | null;
  preview: string;
  rawLine: string;
  sortKey: string;
}

interface DateObj {
  date: string;
  year: string;
  month: string;
  day: string;
  raw: string;
  format: string;
}

export default class KeyTrackPlugin extends Plugin {
  settings: KeyTrackSettings;

  async onload() {
    await this.loadSettings();
    
    // 注册设置标签
    this.addSettingTab(new KeyTrackSettingTab(this.app, this));

    // 注册代码块处理器
    this.registerMarkdownCodeBlockProcessor('keytrack', async (source, el, ctx) => {
      const params = this.parseParams(source, ctx);
      const renderer = new KeyTrackRenderer(this, params, el, ctx);
      ctx.addChild(renderer);
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // 解析代码块参数（支持 key=value 格式）
  private parseParams(source: string, ctx: MarkdownPostProcessorContext): KeyTrackParams {
    const lines = source.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('//'));
    const params: Partial<KeyTrackParams> = {};
    
    // 解析 key=value 对
    for (const line of lines) {
      const match = line.match(/^(\w+)\s*=\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        if (key === 'previewLength' || key === 'maxResults') {
          (params as any)[key] = parseInt(value) || undefined;
        } else if (key === 'showAlias' || key === 'groupByFile' || key === 'removeMarkdown') {
          (params as any)[key] = value.toLowerCase() === 'true';
        } else if (key === 'excludePatterns') {
          (params as any)[key] = value.split(',').map(s => s.trim());
        } else {
          (params as any)[key] = value;
        }
      }
    }

    // 当前文件信息（用于自动获取 queryKey）
    const currentFile = ctx.sourcePath;
    const currentFileName = currentFile.split('/').pop()?.replace(/\.md$/, '') || '';

    // 应用默认值
    return {
      queryKey: params.queryKey || currentFileName,
      previewLength: this.validateEven(params.previewLength ?? this.settings.defaultPreviewLength),
      maxResults: params.maxResults ?? this.settings.defaultMaxResults,
      pathMode: (params.pathMode as any) || 'auto',
      customGlob: params.customGlob || '',
      firstColumnType: (params.firstColumnType as any) || 'auto',
      customColumnText: params.customColumnText || '',
      searchFolder: params.searchFolder || '',
      excludePatterns: params.excludePatterns || this.settings.defaultExcludePatterns,
      showAlias: params.showAlias ?? this.settings.defaultShowAlias,
      groupByFile: params.groupByFile ?? this.settings.defaultGroupByFile,
      removeMarkdown: params.removeMarkdown ?? this.settings.defaultRemoveMarkdown,
    };
  }

  private validateEven(n: number): number {
    return n % 2 === 0 ? n : n + 1;
  }
}

// 渲染器类（处理实际的 DOM 渲染和搜索逻辑）
class KeyTrackRenderer extends MarkdownRenderChild {
  plugin: KeyTrackPlugin;
  params: KeyTrackParams;
  container: HTMLElement;

  constructor(plugin: KeyTrackPlugin, params: KeyTrackParams, container: HTMLElement, ctx: MarkdownPostProcessorContext) {
    super(container);
    this.plugin = plugin;
    this.params = params;
    this.container = container;
  }

  async onload() {
    await this.render();
  }

  async render() {
    const startTime = Date.now();
    this.container.empty();
    this.container.addClass('keytrack-container');

    // 创建加载状态
    const loadingEl = this.container.createEl('div', { text: '🔍 正在搜索...', cls: 'keytrack-loading' });

    try {
      const results = await this.performSearch();
      loadingEl.remove();

      if (results.length === 0) {
        this.container.createEl('div', { 
          text: '暂无相关记录', 
          cls: 'keytrack-empty' 
        });
        return;
      }

      this.renderTable(results);
      
      // 调试信息
      if (this.plugin.settings.debugMode) {
        const duration = Date.now() - startTime;
        this.container.createEl('div', { 
          text: `⏱️ 搜索完成: ${duration}ms | 找到 ${results.length} 条结果`,
          cls: 'keytrack-debug'
        });
      }

    } catch (error) {
      loadingEl.remove();
      const errorDiv = this.container.createEl('div', { cls: 'keytrack-error' });
      errorDiv.createEl('div', { text: `❌ 查询出错: ${error.message}` });
      errorDiv.createEl('small', { text: '请检查配置参数是否正确' });
      console.error('[KeyTrack]', error);
    }
  }

  async performSearch(): Promise<MatchResult[]> {
    const { app } = this.plugin;
    const params = this.params;
    const targetName = params.queryKey;
    
    let L = params.previewLength;
    if (L % 2 !== 0) L += 1;
    const HALF = L / 2;

    // 获取文件列表
    let allFiles = app.vault.getMarkdownFiles();

    // 文件夹过滤
    if (params.searchFolder) {
      const folder = params.searchFolder.replace(/\/$/, '');
      allFiles = allFiles.filter(f => f.path.startsWith(folder + '/'));
    }

    // 排除模式过滤
    if (params.excludePatterns.length > 0) {
      allFiles = allFiles.filter(f => {
        return !params.excludePatterns.some(pattern => f.path.includes(pattern));
      });
    }

    // 自定义 Glob 过滤
    if (params.pathMode === 'custom' && params.customGlob) {
      allFiles = allFiles.filter(f => this.globMatch(params.customGlob, f.path));
    }

    // 排除当前文件
    const currentFile = app.workspace.getActiveFile();
    if (currentFile) {
      allFiles = allFiles.filter(f => f.path !== currentFile.path);
    }

    const escapedName = this.escapeRegExp(targetName);
    const linkPattern = new RegExp(`\\[\\[${escapedName}(?:\\|([^\\]]*))?\\]\\]`, 'gu');
    
    const results: MatchResult[] = [];
    const processedLines = new Set<string>();

    // 遍历文件
    for (const file of allFiles) {
      if (params.maxResults > 0 && results.length >= params.maxResults) break;

      try {
        const content = await app.vault.cachedRead(file);
        const lines = content.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          linkPattern.lastIndex = 0;
          let match;
          
          while ((match = linkPattern.exec(trimmedLine)) !== null) {
            if (processedLines.has(trimmedLine)) break;
            processedLines.add(trimmedLine);

            const fullMatch = match[0];
            const alias = match[1];
            const matchIndex = match.index;

            const beforeRaw = trimmedLine.substring(0, matchIndex);
            const afterRaw = trimmedLine.substring(matchIndex + fullMatch.length);
            
            const cleanBefore = this.cleanMarkdown(beforeRaw, params.removeMarkdown);
            const cleanAfter = this.cleanMarkdown(afterRaw, params.removeMarkdown);
            
            const beforeLen = this.safeLength(cleanBefore);
            const afterLen = this.safeLength(cleanAfter);
            
            const displayName = (params.showAlias && alias) ? alias : targetName;
            const linkDisplay = alias 
              ? `[[${targetName}|${alias}]]` 
              : `[[${targetName}]]`;
            
            let beforePart = '';
            let afterPart = '';

            if (beforeLen === 0) {
              beforePart = '';
            } else if (beforeLen <= HALF) {
              beforePart = cleanBefore;
            } else {
              beforePart = '…' + this.safeSlice(cleanBefore, -(HALF - 1));
            }

            if (afterLen === 0) {
              afterPart = '';
            } else if (afterLen <= HALF) {
              afterPart = cleanAfter;
            } else {
              afterPart = this.safeSlice(cleanAfter, 0, HALF - 1) + '…';
            }

            const preview = `${beforePart}${linkDisplay}${afterPart}`;
            const dateObj = this.extractDateFromPath(file.path);
            
            results.push({
              file,
              dateObj,
              preview,
              rawLine: trimmedLine,
              sortKey: dateObj ? dateObj.date.replace(/\//g, '') : file.basename
            });
            
            break; // 单行多匹配只取第一个
          }
        }
      } catch (e) {
        if (this.plugin.settings.debugMode) {
          console.warn(`[KeyTrack] 无法读取文件: ${file.path}`, e);
        }
      }
    }

    // 排序（日期倒序）
    results.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    return results;
  }

  renderTable(results: MatchResult[]) {
    const table = this.container.createEl('table', { cls: 'keytrack-table' });
    const thead = table.createEl('thead');
    const tbody = table.createEl('tbody');

    // 表头
    const headerRow = thead.createEl('tr');
    headerRow.createEl('th', { text: '来源', cls: 'keytrack-col-source' });
    headerRow.createEl('th', { text: '内容预览', cls: 'keytrack-col-preview' });

    let tableData: [string, string][] = [];

    if (this.params.groupByFile) {
      // 按文件分组
      const grouped: Record<string, { file: TFile, dateObj: DateObj | null, previews: string[] }> = {};
      
      results.forEach(item => {
        const key = item.file.path;
        if (!grouped[key]) {
          grouped[key] = { file: item.file, dateObj: item.dateObj, previews: [] };
        }
        grouped[key].previews.push(item.preview);
      });

      Object.values(grouped).forEach(group => {
        const firstCol = this.formatFirstColumn(group.file, group.dateObj);
        group.previews.forEach((preview, idx) => {
          tableData.push([idx === 0 ? firstCol : '', preview]);
        });
      });
    } else {
      // 不分组
      results.forEach(item => {
        tableData.push([
          this.formatFirstColumn(item.file, item.dateObj),
          item.preview
        ]);
      });
    }

    // 限制显示数量
    if (this.params.maxResults > 0 && tableData.length > this.params.maxResults) {
      tableData = tableData.slice(0, this.params.maxResults);
    }

    // 渲染行
    tableData.forEach(([source, preview]) => {
      const row = tbody.createEl('tr');
      
      // 来源列（可点击链接）
      const sourceCell = row.createEl('td', { cls: 'keytrack-source' });
      if (source) {
        // 解析 Obsidian 链接格式 [[...]]
        const linkMatch = source.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
        if (linkMatch) {
          const [, linkPath, displayText] = linkMatch;
          const linkEl = sourceCell.createEl('a', { 
            text: displayText || linkPath.split('/').pop() || linkPath,
            cls: 'internal-link'
          });
          linkEl.addEventListener('click', (e) => {
            e.preventDefault();
            const file = this.plugin.app.metadataCache.getFirstLinkpathDest(linkPath, '');
            if (file) {
              this.plugin.app.workspace.openLinkText(file.path, '', true);
            }
          });
        } else {
          sourceCell.setText(source);
        }
      }
      
      // 预览列（支持 markdown 渲染）
      const previewCell = row.createEl('td', { cls: 'keytrack-preview' });
      // 将 [[...]] 转换为可点击链接
      const linkedPreview = preview.replace(
        /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, 
        (match, p1, p2) => {
          const display = p2 || p1.split('/').pop() || p1;
          return `<a class="internal-link" data-href="${p1}">${display}</a>`;
        }
      );
      previewCell.innerHTML = linkedPreview;
      
      // 为链接添加点击事件
      previewCell.querySelectorAll('a.internal-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const href = (link as HTMLElement).getAttribute('data-href') || '';
          const file = this.plugin.app.metadataCache.getFirstLinkpathDest(href, '');
          if (file) {
            this.plugin.app.workspace.openLinkText(file.path, '', true);
          }
        });
      });
    });

    // 性能提示
    if (results.length >= 100) {
      this.container.createEl('div', { 
        text: `共找到 ${results.length} 条记录${this.params.maxResults > 0 ? '（已限制显示）' : ''}`,
        cls: 'keytrack-footer'
      });
    }
  }

  // ==================== 工具函数 ====================

  escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  safeSlice(str: string, start: number, end?: number): string {
    if (!str) return '';
    const arr = Array.from(str);
    if (start < 0) {
      return arr.slice(start).join('');
    }
    return arr.slice(start, end).join('');
  }

  safeLength(str: string): number {
    if (!str) return 0;
    return Array.from(str).length;
  }

  globMatch(pattern: string, path: string): boolean {
    if (!pattern) return true;
    const regexPattern = pattern
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/{{GLOBSTAR}}/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  cleanMarkdown(text: string, aggressive: boolean): string {
    if (!text) return '';
    
    let cleaned = text
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^>\s+/gm, '')
      .replace(/\[\^[^\]]*\]/g, '');
    
    if (aggressive) {
      cleaned = cleaned
        .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1');
    }
    
    return cleaned.trim();
  }

  extractDateFromPath(filePath: string): DateObj | null {
    const patterns = [
      { regex: /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/, format: 'YYYY/MM/DD' },
      { regex: /(\d{4})(\d{2})(\d{2})/, format: 'YYYYMMDD' },
      { regex: /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/, format: 'DD/MM/YYYY' }
    ];
    
    for (const p of patterns) {
      const match = filePath.match(p.regex);
      if (match) {
        const [, y, m, d] = match;
        return {
          date: `${y}/${m}/${d}`,
          year: y,
          month: m,
          day: d,
          raw: match[0],
          format: p.format
        };
      }
    }
    return null;
  }

  formatFirstColumn(file: TFile, dateObj: DateObj | null): string {
    const config = this.params;
    const type = config.firstColumnType === 'auto' 
      ? (config.pathMode === 'daily' ? 'date' : 'filename')
      : config.firstColumnType;
    
    const pathWithoutExt = file.path.replace(/\.md$/, '');
    const filename = file.basename;
    
    switch(type) {
      case 'date':
        if (dateObj) {
          const dateStr = dateObj.date;
          return `[[${pathWithoutExt}|${dateStr}]]`;
        }
        return `[[${filename}]]`;
        
      case 'filename':
        return `[[${filename}]]`;
        
      case 'path':
        return `[[${pathWithoutExt}|${file.path}]]`;
        
      case 'custom':
        let text = config.customColumnText || '{{filename}}';
        return text
          .replace(/{{date}}/g, dateObj ? dateObj.date : '')
          .replace(/{{filename}}/g, filename)
          .replace(/{{path}}/g, file.path)
          .replace(/{{title}}/g, filename);
        
      default:
        return `[[${filename}]]`;
    }
  }
}