import { inject, Injectable } from "@angular/core";
import { WINDOW } from "core-library";


const keys = {
    CV_BUILDER_PREVIEW_MODE: 'cv_builder_preview_mode',
    CV_BUILDER_PREVIEW_MODE_HIGH_CONTRAST: 'cv_builder_preview_mode_high_contrast',
    CV_BUILDER_PREVIEW_MODE_TAB: 'cv_builder_preview_tab'
}

@Injectable({
    providedIn: 'root'
})
export class LocalStorageService {

    private readonly window = inject<Window>(WINDOW);

    setItem<T>(key: keyof typeof keys, value: T) {
        this.window.localStorage.setItem(keys[key], JSON.stringify(value));
    }

    getItem<T>(key: keyof typeof keys): T | null {
        const item = this.window.localStorage.getItem(keys[key]);
        return item ? JSON.parse(item) : null;
    }

    removeItem(key: keyof typeof keys) {
        this.window.localStorage.removeItem(keys[key]);
    }

    clear() {
        this.window.localStorage.clear();
    }   
}