import { Injectable } from "@angular/core";
import { Cv } from "../../../api";

@Injectable({
    providedIn: 'root'
})
export class CvBuilderService {
    applyChangesToCv(cv: Cv) {
        const response = { cv };
        if (!response || !response.cv) return response;
        const activeChanges = response.cv?.changes || [];
        if (!activeChanges.length || !response?.cv?.cvExtractedData) return response;

        const extracted: any = { ...response.cv.cvExtractedData };

        for (const change of activeChanges) {
            if (!change.section) continue;
            if (change.deleted || change.viewOrder != null) continue; // gestiti separatamente
            const dotIdx = change.section.indexOf('.');
            const entity = dotIdx !== -1 ? change.section.slice(0, dotIdx) : change.section;
            const field = dotIdx !== -1 ? change.section.slice(dotIdx + 1) : '';

            switch (entity) {
                case 'basicInfo': {
                    let v: string | number | null | undefined = change.newValue;
                    if (field === 'yearsExperience' || field === 'birthYear') {
                        v = change.newValue === '' || change.newValue === 'null' ? null : Number(change.newValue) || null;
                    }
                    extracted.basicInfo = { ...extracted.basicInfo, [field]: v };
                    break;
                }
                case 'overview':
                    extracted.basicInfo = { ...extracted.basicInfo, fullOverview: change.newValue };
                    break;
                case 'highlight':
                    extracted.highlights = (extracted.highlights ?? []).map((h: any) =>
                        h.id === change.identifier
                            ? { ...h, [field]: field === 'years' ? (Number(change.newValue) || 0) : change.newValue }
                            : h
                    );
                    break;
                case 'otherSkill':
                    if (!extracted.otherSkills.some((s: any) => s.id === change.identifier))
                        extracted.otherSkills = [...(extracted.otherSkills ?? []), { id: change.identifier, name: change.newValue }];
                    else
                        extracted.otherSkills = (extracted.otherSkills ?? []).map((s: any) =>
                            s.id === change.identifier ? { ...s, name: change.newValue } : s
                        );
                    break;
                case 'experience':
                    if (!(extracted.experiences ?? []).some((e: any) => e.id === change.identifier)) {
                        const newExp: any = { id: change.identifier, period: '', company: '', role: '', technologies: '', description: '' };
                        newExp[field] = change.newValue;
                        extracted.experiences = [...(extracted.experiences ?? []), newExp];
                    } else {
                        extracted.experiences = (extracted.experiences ?? []).map((e: any) =>
                            e.id === change.identifier ? { ...e, [field]: change.newValue } : e
                        );
                    }
                    break;
                case 'training':
                    if (!(extracted.trainingAndCertificates ?? []).some((t: any) => t.id === change.identifier)) {
                        const newItem: any = { id: change.identifier, title: '', issuer: '', year: '', description: '', type: undefined };
                        if (field === 'type') newItem.type = change.newValue || undefined;
                        else newItem[field] = change.newValue;
                        extracted.trainingAndCertificates = [...(extracted.trainingAndCertificates ?? []), newItem];
                    } else {
                        extracted.trainingAndCertificates = (extracted.trainingAndCertificates ?? []).map((t: any) => {
                            if (t.id !== change.identifier) return t;
                            if (field === 'type') return { ...t, type: change.newValue || undefined };
                            return { ...t, [field]: change.newValue };
                        });
                    }
                    break;
                case 'language':
                    if (!(extracted.languages ?? []).some((l: any) => l.id === change.identifier))
                        extracted.languages = [...(extracted.languages ?? []), { id: change.identifier, language: '', level: '', [field]: change.newValue }];
                    else
                        extracted.languages = (extracted.languages ?? []).map((l: any) =>
                            l.id === change.identifier ? { ...l, [field]: change.newValue } : l
                        );
                    break;
            }
        }

        // ── Applica eliminazioni ───────────────────────────────────────────────
        const deletedIds = new Set<string>(
            activeChanges
                .filter(c => c.deleted)
                .map(c => c.identifier)
                .filter((id): id is string => !!id)
        );
        if (deletedIds.size > 0) {
            extracted.highlights = (extracted.highlights ?? []).filter((h: any) => !deletedIds.has(h.id));
            extracted.otherSkills = (extracted.otherSkills ?? []).filter((s: any) => !deletedIds.has(s.id));
            extracted.experiences = (extracted.experiences ?? []).filter((e: any) => !deletedIds.has(e.id));
            extracted.trainingAndCertificates = (extracted.trainingAndCertificates ?? []).filter((t: any) => !deletedIds.has(t.id));
            extracted.languages = (extracted.languages ?? []).filter((l: any) => !deletedIds.has(l.id));
        }

        // ── Applica riordini ───────────────────────────────────────────────────
        // Per ogni item con viewOrder, prende l'ultimo valore registrato
        const sectionOrders: Record<string, Record<string, number>> = {};
        for (const change of activeChanges) {
            if (change.viewOrder == null || !change.identifier || !change.section) continue;
            if (deletedIds.has(change.identifier)) continue;
            const sec = change.section; // 'highlight' | 'otherSkill' | 'experience' | 'training'
            if (!sectionOrders[sec]) sectionOrders[sec] = {};
            sectionOrders[sec][change.identifier] = change.viewOrder;
        }

        // Crea le esperienze aggiunte che esistono solo come viewOrder (senza modifiche ai campi)
        if (sectionOrders['experience']) {
            for (const id of Object.keys(sectionOrders['experience'])) {
                if (!deletedIds.has(id) && !(extracted.experiences ?? []).some((e: any) => e.id === id)) {
                    extracted.experiences = [
                        ...(extracted.experiences ?? []),
                        { id, period: '', company: '', role: '', technologies: '', description: '' },
                    ];
                }
            }
        }

        const applyViewOrder = (list: any[], orders: Record<string, number>): any[] => {
            const orderedPairs = Object.entries(orders)
                .filter(([id]) => list.some(item => item.id === id))
                .sort((a, b) => a[1] - b[1]);
            const unordered = list.filter(item => orders[item.id] === undefined);
            const result = [...unordered];
            for (const [id, pos] of orderedPairs) {
                const item = list.find(i => i.id === id)!;
                result.splice(Math.min(pos, result.length), 0, item);
            }
            return result;
        };

        if (sectionOrders['highlight'])
            extracted.highlights = applyViewOrder(extracted.highlights ?? [], sectionOrders['highlight']);
        if (sectionOrders['otherSkill'])
            extracted.otherSkills = applyViewOrder(extracted.otherSkills ?? [], sectionOrders['otherSkill']);
        if (sectionOrders['experience'])
            extracted.experiences = applyViewOrder(extracted.experiences ?? [], sectionOrders['experience']);
        if (sectionOrders['training'])
            extracted.trainingAndCertificates = applyViewOrder(extracted.trainingAndCertificates ?? [], sectionOrders['training']);
        if (sectionOrders['language'])
            extracted.languages = applyViewOrder(extracted.languages ?? [], sectionOrders['language']);

        return { ...response, cv: { ...response.cv, cvExtractedData: extracted } };
    }

}