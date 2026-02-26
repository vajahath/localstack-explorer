import {
    Component,
    input,
    effect,
    OnDestroy,
    inject,
    ChangeDetectionStrategy,
    viewChild,
    ElementRef,
    untracked
} from '@angular/core';
import loader from '@monaco-editor/loader';
import { ThemeService } from '../../services/theme.service';

@Component({
    selector: 'app-monaco-editor',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div #editorContainer class="w-full h-full min-h-[400px] border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden"></div>
  `,
    styles: [`
    :host { display: block; width: 100%; height: 100%; min-height: 400px; }
  `]
})
export class MonacoEditorComponent implements OnDestroy {
    content = input.required<string>();
    language = input.required<string>();

    editorContainer = viewChild<ElementRef<HTMLElement>>('editorContainer');

    private themeService = inject(ThemeService);
    private editorInstance: any = null;

    constructor() {
        // Effect to initialize the editor once the container is available
        effect(async () => {
            const container = this.editorContainer();
            if (container && !this.editorInstance) {
                console.log('[MonacoEditor] Container ready, initializing...');
                await this.initMonaco(container.nativeElement);
            }
        });

        // Effect to update content and language
        effect(() => {
            const text = this.content();
            const lang = this.language();

            if (this.editorInstance) {
                untracked(() => {
                    console.log('[MonacoEditor] Updating content/language');
                    this.updateEditor(text, lang);
                });
            }
        });

        // Effect to handle theme changes
        effect(() => {
            const isDark = this.themeService.isDark();
            if (this.editorInstance) {
                const monaco = (window as any).monaco;
                if (monaco) {
                    monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
                }
            }
        });
    }

    ngOnDestroy() {
        if (this.editorInstance) {
            console.log('[MonacoEditor] Disposing editor');
            this.editorInstance.dispose();
            this.editorInstance = null;
        }
    }

    private async initMonaco(hostElement: HTMLElement) {
        try {
            console.log('[MonacoEditor] Loading Monaco library...');
            const monaco = await loader.init();
            console.log('[MonacoEditor] Monaco library loaded');

            const initialTheme = this.themeService.isDark() ? 'vs-dark' : 'vs';

            this.editorInstance = monaco.editor.create(hostElement, {
                value: untracked(() => this.content()),
                language: untracked(() => this.language()),
                theme: initialTheme,
                readOnly: true,
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 12,
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderWhitespace: 'none',
                wordWrap: 'on',
                padding: { top: 10, bottom: 10 },
                scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible',
                    useShadows: false,
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10
                }
            });
            console.log('[MonacoEditor] Editor instance created');
        } catch (error) {
            console.error('[MonacoEditor] Failed to initialize:', error);
        }
    }

    private updateEditor(content: string, language: string) {
        const monaco = (window as any).monaco;
        if (this.editorInstance && monaco) {
            const model = this.editorInstance.getModel();
            if (model) {
                monaco.editor.setModelLanguage(model, language);
            }
            this.editorInstance.setValue(content);
            // Wait for layout
            setTimeout(() => this.editorInstance?.layout(), 100);
        }
    }
}
