import { App, PluginSettingTab, Setting } from 'obsidian';
import KeyTrackPlugin from './main';

export interface KeyTrackSettings {
  defaultPreviewLength: number;
  defaultMaxResults: number;
  defaultShowAlias: boolean;
  defaultGroupByFile: boolean;
  defaultRemoveMarkdown: boolean;
  defaultExcludePatterns: string[];
  debugMode: boolean;
}

export const DEFAULT_SETTINGS: KeyTrackSettings = {
  defaultPreviewLength: 10,
  defaultMaxResults: 200,
  defaultShowAlias: true,
  defaultGroupByFile: true,
  defaultRemoveMarkdown: true,
  defaultExcludePatterns: ['Templates/', 'Archive/', '.obsidian/'],
  debugMode: false,
};

export class KeyTrackSettingTab extends PluginSettingTab {
  plugin: KeyTrackPlugin;

  constructor(app: App, plugin: KeyTrackPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'KeyTrack 设置' });

    new Setting(containerEl)
      .setName('默认预览长度')
      .setDesc('上下文预览的字符数（每侧，建议保持偶数）')
      .addText(text => text
        .setPlaceholder('10')
        .setValue(String(this.plugin.settings.defaultPreviewLength))
        .onChange(async (value) => {
          const num = parseInt(value) || 10;
          this.plugin.settings.defaultPreviewLength = num % 2 === 0 ? num : num + 1;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('默认最大结果数')
      .setDesc('防止卡顿的结果上限（0=无限制）')
      .addText(text => text
        .setPlaceholder('200')
        .setValue(String(this.plugin.settings.defaultMaxResults))
        .onChange(async (value) => {
          this.plugin.settings.defaultMaxResults = parseInt(value) || 200;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('默认显示别名')
      .setDesc('显示 [[原名|别名]] 中的别名文本')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.defaultShowAlias)
        .onChange(async (value) => {
          this.plugin.settings.defaultShowAlias = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('默认按文件分组')
      .setDesc('相同文件的多个匹配合并显示')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.defaultGroupByFile)
        .onChange(async (value) => {
          this.plugin.settings.defaultGroupByFile = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('清理 Markdown 标记')
      .setDesc('在预览中移除粗体、斜体等格式（保留链接）')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.defaultRemoveMarkdown)
        .onChange(async (value) => {
          this.plugin.settings.defaultRemoveMarkdown = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('排除模式')
      .setDesc('默认排除的路径模式（逗号分隔）')
      .addTextArea(text => text
        .setPlaceholder('Templates/, Archive/, .obsidian/')
        .setValue(this.plugin.settings.defaultExcludePatterns.join(', '))
        .onChange(async (value) => {
          this.plugin.settings.defaultExcludePatterns = value.split(',').map(s => s.trim()).filter(s => s);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('调试模式')
      .setDesc('在控制台输出性能日志')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.debugMode)
        .onChange(async (value) => {
          this.plugin.settings.debugMode = value;
          await this.plugin.saveSettings();
        }));
  }
}