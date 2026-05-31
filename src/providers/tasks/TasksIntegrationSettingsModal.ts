import { PluginState } from '../../core/PluginState';
import { Modal, Setting } from 'obsidian';
import FullCalendarPlugin from '../../main';
import { t } from '../../features/i18n/i18n';
import {
  TasksBacklogDateTarget,
  TasksDateTarget,
  TasksDisplayFormat,
  TasksCustomTimeFormat,
  TasksTimeToken,
  TasksTimePosition
} from '../../types/settings';
import { formatCustomTimeBlock, extractCustomTime } from './customTimeFormat';

export class TasksIntegrationSettingsModal extends Modal {
  constructor(
    private plugin: FullCalendarPlugin,
    private onChange: () => void
  ) {
    super(plugin.app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.titleEl.setText(t('settings.tasksIntegration.modal.title'));

    const settings = PluginState.getSettings().tasksIntegration;

    new Setting(this.contentEl)
      .setName(t('settings.tasksIntegration.backlogDateTarget.label'))
      .setDesc(t('settings.tasksIntegration.backlogDateTarget.description'))
      .addDropdown(dropdown => {
        dropdown
          .addOption('scheduledDate', t('settings.tasksIntegration.backlogDateTarget.scheduled'))
          .addOption('startDate', t('settings.tasksIntegration.backlogDateTarget.start'))
          .addOption('dueDate', t('settings.tasksIntegration.backlogDateTarget.due'))
          .setValue(settings.backlogDateTarget)
          .onChange(async value => {
            settings.backlogDateTarget = value as TasksBacklogDateTarget;
            await PluginState.saveSettings();
            PluginState.getProviderRegistry().refreshBacklogViews();
            this.onChange();
          });
      });

    new Setting(this.contentEl)
      .setName(t('settings.tasksIntegration.calendarDisplayDateTarget.label'))
      .setDesc(t('settings.tasksIntegration.calendarDisplayDateTarget.description'))
      .addDropdown(dropdown => {
        dropdown
          .addOption('scheduledDate', t('settings.tasksIntegration.backlogDateTarget.scheduled'))
          .addOption('startDate', t('settings.tasksIntegration.backlogDateTarget.start'))
          .addOption('dueDate', t('settings.tasksIntegration.backlogDateTarget.due'))
          .setValue(settings.calendarDisplayDateTarget)
          .onChange(async value => {
            settings.calendarDisplayDateTarget = value as TasksDateTarget;
            await PluginState.saveSettings();
            this.onChange();
          });
      });

    new Setting(this.contentEl)
      .setName(t('settings.tasksIntegration.openEditModalAfterBacklogDrop.label'))
      .setDesc(t('settings.tasksIntegration.openEditModalAfterBacklogDrop.description'))
      .addToggle(toggle => {
        toggle.setValue(settings.openEditModalAfterBacklogDrop).onChange(async value => {
          settings.openEditModalAfterBacklogDrop = value;
          await PluginState.saveSettings();
          this.onChange();
        });
      });

    new Setting(this.contentEl)
      .setName(t('settings.tasksIntegration.includeGlobalQueryInBacklog.label'))
      .setDesc(t('settings.tasksIntegration.includeGlobalQueryInBacklog.description'))
      .addToggle(toggle => {
        toggle.setValue(settings.includeGlobalQueryInBacklog ?? false).onChange(async value => {
          settings.includeGlobalQueryInBacklog = value;
          await PluginState.saveSettings();
          PluginState.getProviderRegistry().refreshBacklogViews();
          this.onChange();
        });
      });

    new Setting(this.contentEl)
      .setName(t('settings.tasksIntegration.backlogQuery.label'))
      .setDesc(t('settings.tasksIntegration.backlogQuery.description'))
      .addTextArea(text => {
        text
          .setPlaceholder(t('settings.tasksIntegration.backlogQuery.placeholder'))
          .setValue(settings.backlogQuery ?? '')
          .onChange(async value => {
            settings.backlogQuery = value;
            await PluginState.saveSettings();
            PluginState.getProviderRegistry().refreshBacklogViews();
            this.onChange();
          });
        text.inputEl.rows = 6;
        text.inputEl.cols = 50;
        text.inputEl.setCssProps({ width: '100%' });
      });

    new Setting(this.contentEl)
      .setName(t('settings.tasksIntegration.taskDisplayFormat.label'))
      .setDesc(t('settings.tasksIntegration.taskDisplayFormat.description'))
      .addDropdown(dropdown => {
        dropdown
          .addOption('standard', t('settings.tasksIntegration.taskDisplayFormat.standard'))
          .addOption('dayPlanner', t('settings.tasksIntegration.taskDisplayFormat.dayPlanner'))
          .addOption('custom', t('settings.tasksIntegration.taskDisplayFormat.custom'))
          .setValue(settings.taskDisplayFormat ?? 'dayPlanner')
          .onChange(async value => {
            settings.taskDisplayFormat = value as TasksDisplayFormat;
            await PluginState.saveSettings();
            this.onOpen(); // re-render to show/hide the custom sub-pane
            this.onChange();
          });
      });

    if ((settings.taskDisplayFormat ?? 'dayPlanner') === 'custom') {
      this.renderCustomFormatPane();
    }
  }

  /** Ensures the custom-format config object exists, returning a mutable reference. */
  private getCustomFormat(): TasksCustomTimeFormat {
    const settings = PluginState.getSettings().tasksIntegration;
    if (!settings.customTimeFormat) {
      settings.customTimeFormat = {
        timeToken: 'HH:mm',
        prefix: '(',
        suffix: ')',
        rangeSeparator: '-',
        position: 'beforeDate'
      };
    }
    return settings.customTimeFormat;
  }

  /**
   * Renders a "preset dropdown + Custom… text field" control for a literal
   * delimiter field (prefix / suffix / rangeSeparator).
   */
  private renderDelimiterSetting(
    name: string,
    desc: string,
    presets: { value: string; label: string }[],
    customLabel: string,
    getValue: () => string,
    setValue: (v: string) => void,
    onAfterChange: () => void
  ): void {
    const current = getValue();
    const isPreset = presets.some(p => p.value === current);

    const setting = new Setting(this.contentEl).setName(name).setDesc(desc);
    let textInputEl: HTMLInputElement | null = null;

    setting.addDropdown(dropdown => {
      for (const preset of presets) {
        dropdown.addOption(preset.value, preset.label);
      }
      dropdown.addOption('__custom__', customLabel);
      dropdown.setValue(isPreset ? current : '__custom__').onChange(async value => {
        if (value === '__custom__') {
          if (textInputEl) {
            textInputEl.setCssProps({ display: '' });
            textInputEl.focus();
          }
          return;
        }
        setValue(value);
        await PluginState.saveSettings();
        onAfterChange();
        this.onOpen();
      });
    });

    setting.addText(text => {
      textInputEl = text.inputEl;
      text
        .setPlaceholder(t('settings.tasksIntegration.customTimeFormat.customValuePlaceholder'))
        .setValue(current)
        .onChange(async value => {
          setValue(value);
          await PluginState.saveSettings();
          onAfterChange();
        });
      if (isPreset) {
        text.inputEl.setCssProps({ display: 'none' });
      }
    });
  }

  /** Renders the full custom-format configuration sub-pane plus a live preview. */
  private renderCustomFormatPane(): void {
    const fmt = this.getCustomFormat();
    let previewEl: HTMLElement | null = null;
    const refreshPreview = () => {
      if (previewEl) {
        this.renderCustomPreview(previewEl);
      }
    };

    new Setting(this.contentEl)
      .setName(t('settings.tasksIntegration.customTimeFormat.timeToken.label'))
      .setDesc(t('settings.tasksIntegration.customTimeFormat.timeToken.description'))
      .addDropdown(dropdown => {
        for (const token of ['HH:mm', 'H:mm', 'h:mm A', 'hh:mm A'] as TasksTimeToken[]) {
          dropdown.addOption(token, token);
        }
        dropdown.setValue(fmt.timeToken).onChange(async value => {
          fmt.timeToken = value as TasksTimeToken;
          await PluginState.saveSettings();
          refreshPreview();
        });
      });

    this.renderDelimiterSetting(
      t('settings.tasksIntegration.customTimeFormat.prefix.label'),
      t('settings.tasksIntegration.customTimeFormat.prefix.description'),
      [
        { value: '', label: t('settings.tasksIntegration.customTimeFormat.prefix.none') },
        { value: '(', label: t('settings.tasksIntegration.customTimeFormat.prefix.paren') },
        { value: '⏰ ', label: t('settings.tasksIntegration.customTimeFormat.prefix.clock') }
      ],
      t('settings.tasksIntegration.customTimeFormat.prefix.custom'),
      () => fmt.prefix,
      v => {
        fmt.prefix = v;
      },
      refreshPreview
    );

    this.renderDelimiterSetting(
      t('settings.tasksIntegration.customTimeFormat.suffix.label'),
      t('settings.tasksIntegration.customTimeFormat.suffix.description'),
      [
        { value: '', label: t('settings.tasksIntegration.customTimeFormat.suffix.none') },
        { value: ')', label: t('settings.tasksIntegration.customTimeFormat.suffix.paren') }
      ],
      t('settings.tasksIntegration.customTimeFormat.suffix.custom'),
      () => fmt.suffix,
      v => {
        fmt.suffix = v;
      },
      refreshPreview
    );

    this.renderDelimiterSetting(
      t('settings.tasksIntegration.customTimeFormat.rangeSeparator.label'),
      t('settings.tasksIntegration.customTimeFormat.rangeSeparator.description'),
      [
        { value: '-', label: t('settings.tasksIntegration.customTimeFormat.rangeSeparator.dash') },
        {
          value: ' - ',
          label: t('settings.tasksIntegration.customTimeFormat.rangeSeparator.spacedDash')
        },
        { value: '–', label: t('settings.tasksIntegration.customTimeFormat.rangeSeparator.endash') },
        { value: ' to ', label: t('settings.tasksIntegration.customTimeFormat.rangeSeparator.to') }
      ],
      t('settings.tasksIntegration.customTimeFormat.rangeSeparator.custom'),
      () => fmt.rangeSeparator,
      v => {
        fmt.rangeSeparator = v;
      },
      refreshPreview
    );

    new Setting(this.contentEl)
      .setName(t('settings.tasksIntegration.customTimeFormat.position.label'))
      .setDesc(t('settings.tasksIntegration.customTimeFormat.position.description'))
      .addDropdown(dropdown => {
        dropdown
          .addOption(
            'beforeDate',
            t('settings.tasksIntegration.customTimeFormat.position.beforeDate')
          )
          .addOption(
            'dayPlanner',
            t('settings.tasksIntegration.customTimeFormat.position.dayPlanner')
          )
          .addOption('endOfLine', t('settings.tasksIntegration.customTimeFormat.position.endOfLine'))
          .setValue(fmt.position)
          .onChange(async value => {
            fmt.position = value as TasksTimePosition;
            await PluginState.saveSettings();
            refreshPreview();
          });
      });

    new Setting(this.contentEl).setName(
      t('settings.tasksIntegration.customTimeFormat.preview.label')
    );
    previewEl = this.contentEl.createDiv({ cls: 'ofc-custom-time-preview' });
    this.renderCustomPreview(previewEl);
  }

  /** Renders a "writes / parses back as" preview using a sample range. */
  private renderCustomPreview(container: HTMLElement): void {
    const today = new Date().toISOString().slice(0, 10);
    const fmt = this.getCustomFormat();
    container.empty();
    const sample = formatCustomTimeBlock('09:00', '10:30', fmt);
    const parsed = extractCustomTime(`Sample ${sample}`, fmt);
    const parsedText = parsed
      ? `${parsed.startTime}${parsed.endTime ? `–${parsed.endTime}` : ''}`
      : '—';
    container.createEl('div', {
      text: `${t('settings.tasksIntegration.customTimeFormat.preview.writes')}: - [ ] Sample ${sample} ⏳ ${today}`
    });
    container.createEl('div', {
      text: `${t('settings.tasksIntegration.customTimeFormat.preview.parsesBack')}: ${parsedText}`
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
