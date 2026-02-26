import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SetupWizardComponent } from './setup-wizard';
import { S3Service } from '../../services/s3.service';
import { StateService } from '../../services/state.service';
import { signal } from '@angular/core';

describe('SetupWizardComponent', () => {
    let s3ServiceSpy: {
        connect: ReturnType<typeof vi.fn>;
        disconnect: ReturnType<typeof vi.fn>;
        listBuckets: ReturnType<typeof vi.fn>;
        endpoint: ReturnType<typeof signal<string | null>>;
    };
    let stateServiceSpy: {
        endpoint: ReturnType<typeof signal<string | null>>;
        isConnected: ReturnType<typeof signal<boolean>>;
    };
    let routerSpy: { navigate: ReturnType<typeof vi.fn> };

    const TEST_ENDPOINT = 'http://localhost:4566/';

    beforeEach(async () => {
        s3ServiceSpy = {
            connect: vi.fn(),
            disconnect: vi.fn(),
            listBuckets: vi.fn().mockResolvedValue([]),
            endpoint: signal<string | null>(null),
        };
        stateServiceSpy = {
            endpoint: signal<string | null>(null),
            isConnected: signal(false),
        };
        routerSpy = { navigate: vi.fn() };

        await TestBed.configureTestingModule({
            imports: [SetupWizardComponent],
            providers: [
                { provide: S3Service, useValue: s3ServiceSpy },
                { provide: StateService, useValue: stateServiceSpy },
                { provide: Router, useValue: routerSpy },
            ],
        }).compileComponents();
    });

    it('should create the component', () => {
        const fixture = TestBed.createComponent(SetupWizardComponent);
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should display the connect button', () => {
        const fixture = TestBed.createComponent(SetupWizardComponent);
        fixture.detectChanges();
        const el: HTMLElement = fixture.nativeElement;
        const button = el.querySelector('button[type="submit"]');
        expect(button).toBeTruthy();
        expect(button?.textContent).toContain('Connect to Explorer');
    });

    it('should pre-fill the endpoint input with the default value', () => {
        const fixture = TestBed.createComponent(SetupWizardComponent);
        fixture.detectChanges();
        const endpoint: HTMLInputElement = fixture.nativeElement.querySelector('#endpoint');
        expect(endpoint.value).toBe('http://localhost:4566/');
    });

    it('should show a validation error when the endpoint is invalid and touched', () => {
        const fixture = TestBed.createComponent(SetupWizardComponent);
        fixture.detectChanges();
        const component = fixture.componentInstance;

        component.form.controls.endpoint.setValue('not-a-url');
        component.form.controls.endpoint.markAsTouched();
        fixture.detectChanges();

        const errorEl: HTMLElement = fixture.nativeElement.querySelector('p.text-red-500');
        expect(errorEl).toBeTruthy();
        expect(errorEl.textContent).toContain('valid URL');
    });

    it('should disable the submit button when the form is invalid', () => {
        const fixture = TestBed.createComponent(SetupWizardComponent);
        fixture.detectChanges();
        const component = fixture.componentInstance;

        component.form.controls.endpoint.setValue('');
        fixture.detectChanges();

        const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
        expect(button.disabled).toBe(true);
    });

    describe('connect()', () => {
        it('should call s3Service.connect() with the endpoint', async () => {
            const fixture = TestBed.createComponent(SetupWizardComponent);
            fixture.detectChanges();
            const component = fixture.componentInstance;

            component.form.controls.endpoint.setValue(TEST_ENDPOINT);
            await component.connect();

            expect(s3ServiceSpy.connect).toHaveBeenCalledWith(TEST_ENDPOINT);
        });

        it('should set stateService.isConnected to true on success', async () => {
            const fixture = TestBed.createComponent(SetupWizardComponent);
            fixture.detectChanges();
            const component = fixture.componentInstance;

            component.form.controls.endpoint.setValue(TEST_ENDPOINT);
            await component.connect();

            expect(stateServiceSpy.isConnected()).toBe(true);
        });

        it('should navigate to /explorer with encoded endpoint on success', async () => {
            const fixture = TestBed.createComponent(SetupWizardComponent);
            fixture.detectChanges();
            const component = fixture.componentInstance;

            component.form.controls.endpoint.setValue(TEST_ENDPOINT);
            await component.connect();

            expect(routerSpy.navigate).toHaveBeenCalledWith([
                '/explorer',
                { endpoint: btoa(TEST_ENDPOINT) },
            ]);
        });

        it('should show an errorMessage and call s3Service.disconnect() on failure', async () => {
            s3ServiceSpy.listBuckets.mockRejectedValue(new Error('Connection refused'));
            const fixture = TestBed.createComponent(SetupWizardComponent);
            fixture.autoDetectChanges(true);
            const component = fixture.componentInstance;

            component.form.controls.endpoint.setValue(TEST_ENDPOINT);
            await component.connect();
            await fixture.whenStable();

            expect(component.errorMessage()).toBe('Connection refused');
            expect(s3ServiceSpy.disconnect).toHaveBeenCalled();
        });

        it('should do nothing when the form is invalid', async () => {
            const fixture = TestBed.createComponent(SetupWizardComponent);
            fixture.detectChanges();
            const component = fixture.componentInstance;

            component.form.controls.endpoint.setValue('');
            await component.connect();

            expect(s3ServiceSpy.connect).not.toHaveBeenCalled();
        });

        it('should set isLoading to false after connect() resolves', async () => {
            const fixture = TestBed.createComponent(SetupWizardComponent);
            fixture.detectChanges();
            const component = fixture.componentInstance;

            component.form.controls.endpoint.setValue(TEST_ENDPOINT);
            await component.connect();

            expect(component.isLoading()).toBe(false);
        });

        it('should display the error message in the DOM', async () => {
            s3ServiceSpy.listBuckets.mockRejectedValue(new Error('Network Error'));
            const fixture = TestBed.createComponent(SetupWizardComponent);
            fixture.detectChanges();
            const component = fixture.componentInstance;

            component.form.controls.endpoint.setValue(TEST_ENDPOINT);
            await component.connect();
            fixture.detectChanges();

            const errorDiv: HTMLElement | null = fixture.nativeElement.querySelector('[class*="text-red"]');
            expect(errorDiv).toBeTruthy();
            expect(errorDiv!.textContent).toContain('Network Error');
        });
    });
});
