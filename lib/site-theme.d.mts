export type SiteTheme='ocean'|'violet'|'forest'|'amber'|'charcoal';
export const siteThemes:ReadonlyArray<{id:SiteTheme;label:string}>;
export function normalizeSiteTheme(value:unknown):SiteTheme|undefined;
