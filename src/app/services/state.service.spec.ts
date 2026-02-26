import { TestBed } from '@angular/core/testing';
import { StateService } from './state.service';
import { Router } from '@angular/router';

describe('StateService', () => {
    let service: StateService;
    let routerSpy: jasmine.SpyObj<Router>;

    beforeEach(() => {
        const spy = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.configureTestingModule({
            providers: [
                StateService,
                { provide: Router, useValue: spy }
            ]
        });

        service = TestBed.inject(StateService);
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should reset state when navigating to a bucket', () => {
        service.selectedPathParts.set(['folder1', 'folder2']);
        service.activeObject.set({ Key: 'file.txt' });

        service.navigateBucket('new-bucket');

        expect(service.selectedBucket()).toBe('new-bucket');
        expect(service.selectedPathParts()).toEqual([]);
        expect(service.activeObject()).toBeNull();
    });

    it('should update path parts when navigatePath is called', () => {
        const parts = ['a', 'b'];
        service.navigatePath(parts);
        expect(service.selectedPathParts()).toEqual(parts);
    });

    it('should compute the correct prefix', () => {
        service.selectedPathParts.set(['a', 'b']);
        expect(service.currentPrefix()).toBe('a/b/');

        service.selectedPathParts.set([]);
        expect(service.currentPrefix()).toBe('');
    });
});
