import { Component, computed, ElementRef, inject, input } from '@angular/core';
import { Cv, GetCvResponse, Talent, TalentExternalData } from '../../api';

export type CvPreviewItem = {
  cv: Cv,
  talent: Talent,
  externalData: TalentExternalData
}

@Component({
  selector: 'lib-cv-previewer',
  imports: [],
  templateUrl: './cv-previewer.html',
  styleUrl: './cv-previewer.scss',
})
export class CvPreviewer {

  cv = input.required<CvPreviewItem>();

  evidenceTitle = computed(() => {
    const lang = this.cv().cv?.cvExtractedData?.basicInfo?.language;
    return lang === 'en' ? 'HIGHLIGHTS' : 'IN EVIDENZA';
  })

  otherSkillsTitle = computed(() => {
    const lang = this.cv().cv?.cvExtractedData?.basicInfo?.language;
    return lang === 'en' ? 'OTHER SKILLS' : 'ALTRO';
  })

  languagesLabel = computed(() => {
    const lang = this.cv().cv?.cvExtractedData?.basicInfo?.language;
    return lang === 'en' ? 'LANGUAGES' : 'LINGUE';
  })

  experienceLabel = computed(() => {
    const lang = this.cv().cv?.cvExtractedData?.basicInfo?.language;
    return lang === 'en' ? 'EXPERIENCE' : 'ESPERIENZE';
  })

  trainingAndCertificationLabel = computed(() => {
    const lang = this.cv().cv?.cvExtractedData?.basicInfo?.language;
    return lang === 'en' ? 'TRAINING AND CERTIFICATIONS' : 'FORMAZIONE E CERTIFICAZIONI';
  })

  techsLable = computed(() => {
    const lang = this.cv().cv?.cvExtractedData?.basicInfo?.language;
    return lang === 'en' ? 'Used technologies' : 'Tecnologie utilizzate';
  })

  yearsLabel = computed(() => {
    const lang = this.cv().cv?.cvExtractedData?.basicInfo?.language;
    return lang === 'en' ? 'years' : 'anni';
  })

  yearLabel = computed(() => {
    const lang = this.cv().cv?.cvExtractedData?.basicInfo?.language;
    return lang === 'en' ? 'year' : 'anno';
  })

  techs = computed(() => this.cv().cv?.cvExtractedData?.highlights || []);

  otherSkills = computed(() => this.cv().cv?.cvExtractedData?.otherSkills || []);

  languages = computed(() => this.cv().cv?.cvExtractedData?.languages || []);

  candidateBaseInfo = computed(() => {
    const basicInfo = this.cv().cv?.cvExtractedData?.basicInfo;
    if (!basicInfo) return null;

    return {
      name: basicInfo.name,
      role: basicInfo.title,
      seniorityLabel: basicInfo.seniorityLabel,
      yearsExperience: basicInfo.yearsExperience,
      birthYear: basicInfo.birthYear ?  basicInfo.language === 'en' ? 'Year of birth ' + basicInfo.birthYear : 'Anno di nascita ' + basicInfo.birthYear : null,
      overview: basicInfo.fullOverview
    }
  })

  experiences = computed(() => this.cv().cv?.cvExtractedData?.experiences || []);

  trainingAndCertifications = computed(() => this.cv().cv?.cvExtractedData?.trainingAndCertificates || []);

  private readonly elRef = inject(ElementRef);

  print(): void {
    const el = this.elRef.nativeElement as HTMLElement;
    const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('');

    const w = window.open('', '_blank');
    if (!w) return;

    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}` +
      `<style>@page{size:A4;margin:11mm 15mm}body{margin:0;padding:0;}lib-cv-previewer{padding:0!important;box-shadow:none!important;width:100%!important;margin:0!important;}</style>` +
      `</head><body>${el.outerHTML}</body></html>`
    );
    w.document.close();

    let printed = false;
    const doPrint = () => {
      if (printed) return;
      printed = true;
      w.focus();
      w.print();
      w.close();
    };
    w.onload = doPrint;
    setTimeout(doPrint, 800);
  }
}
