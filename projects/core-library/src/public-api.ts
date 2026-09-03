/*
 * Public API Surface of core-library
 */

import { HttpContextToken } from '@angular/common/http';

export { TEMPLATES_TOKEN } from './lib/components/calendar/models';

export {HeaderComponent} from './lib/components/layout/header/header.component';
export {SidenavComponent} from './lib/components/layout/sidenav/sidenav.component';
export {MainComponent} from './lib/components/layout/main/main.component'
export {SpinnerComponent} from './lib/components/layout/spinner/spinner.component'
export {InputComponent} from './lib/components/forms/input/input.component'
export {JsonFormsComponent} from './lib/components/forms/json-forms/json-forms.component'
export {ContainerComponent} from './lib/components/layout/container/container.component'
export {EntityManagerComponent} from './lib/components/entity-manager/entity-manager.component'
export {RightActionSidenavComponent} from './lib/components/layout/right-action-sidenav/right-action-sidenav.component'
export {FilterSidenavComponent} from './lib/components/layout/filter-sidenav/filter-sidenav.component'
export type {FilterConfig, FilterRow, FilterGroup, SavedQuery} from './lib/components/layout/filter-sidenav/filter-sidenav.component'
export {BaseLookupInputComponent} from './lib/components/forms/base-lookup-input/base-lookup-input.component'

export {provideTableComponents, configureBaseCrudAdmin, configureBaseCrudAdminGetMetadata, provideFormComponents, provideSubmitForm, GET_TABLE_METADATA, FETCH_DATA_TOKEN} from './lib/provides/provide-table-data'
export type {UiResourceMetadata} from './lib/base-crud-admin/models/model/uiResourceMetadata'

export {BaseLookupRenderComponent} from './lib/components/table/base-lookup-render/base-lookup-render.component';
export type {IBaseLookupRender, IBaseColumn} from './lib/components/table/base-lookup-render/base-lookup-render.component';
export {EmptyComponent} from './lib/components/empty/empty.component';
export {DataTableComponent} from './lib/components/data-table/data-table.component';

// Tokens
export {WINDOW} from './lib/tokens/window.token';

export {LayoutService} from './lib/components/layout/layout-service'
export {CalendarComponent} from './lib/components/calendar/calendar/calendar.component'
export {CalendarEventTemplate} from './lib/components/calendar/calendar-event-template'
export type {CalendarEvent, Day, DayItem, BaseDayItem}from './lib/components/calendar/models'
export {Worksheet} from './lib/components/worksheet/worksheet'
export {JoditComponent} from './lib/components/forms/jodit/jodit.component'
export {MonacoEditorFormComponent} from './lib/components/monaco-editor/monaco-editor';

export const PREVENT_SPINNER = new HttpContextToken<boolean>(() => false);