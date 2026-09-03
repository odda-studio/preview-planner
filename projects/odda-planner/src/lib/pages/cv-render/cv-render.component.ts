import { Component, computed, inject, OnDestroy, OnInit, PLATFORM_ID } from "@angular/core";
import { DOCUMENT, isPlatformBrowser } from "@angular/common";
import { CvPreviewer, CvPreviewItem } from "../../components/cv-previewer/cv-previewer";
import { watchParam } from "../../signals";
import { CvService } from "../../api";
import { rxResource } from "@angular/core/rxjs-interop";
import { CvBuilderService } from "../management/cv-builder/cv-builder.service";

@Component({
    selector: 'lib-cv-render',
    template: `
    @if(cvPreviewItem() && browser) {
        <lib-cv-previewer [cv]="cvPreviewItem()!"></lib-cv-previewer>
    }
    `,
    imports: [CvPreviewer]
})
export class CvRenderComponent implements OnInit, OnDestroy {
    private readonly doc = inject(DOCUMENT);
    private readonly cvBuilderService = inject(CvBuilderService);
    private readonly platform = inject(PLATFORM_ID)
    browser = isPlatformBrowser(this.platform);

    ngOnInit(): void {
        this.doc.body.classList.add('cv-render-page');
    }

    ngOnDestroy(): void {
        this.doc.body.classList.remove('cv-render-page');
    }

    cvId = watchParam('cvId', Number);
    token = watchParam('token');

    cvService = inject(CvService);
    
    cv = rxResource({
        stream: () => this.cvService.getPublicCvById({ id: this.cvId()!, token: this.token()! })
    })


    cvPreviewItem = computed(() => {
        let cv = this.cv.value();
        if (!cv) return null;
    
        return {
            cv: {
                cvExtractedData: cv
            },
            talent: {},
            externalData: {}
        } as CvPreviewItem
    })
}