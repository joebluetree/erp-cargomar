/** One menu the user may open: its id (for its rights), code (passed in the URL as `menuId`), name and route. */
export interface MenuEntry {
  id: string;
  code: string;
  name: string;
  /** The route without a leading slash, such as `reports/companies`. */
  route: string;
}

/** One module (menu group) with the user's menus under it, in menu order. */
export interface MenuModule {
  id: string;
  name: string;
  menus: MenuEntry[];
}

/** What `GET /api/admin/menu` returns: the user's modules in module order, each with at least one menu. */
export interface UserMenu {
  modules: MenuModule[];
}

/** The user's rights on one menu in the session branch. */
export interface MenuRights {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  print: boolean;
  email: boolean;
  docs: boolean;
  docsUpload: boolean;
  admin: boolean;
}

/** One entry of what `GET /api/admin/menu/rights?codes=` returns: a menu code with the user's rights on it. */
export interface MenuCodeRights extends MenuRights {
  code: string;
}

/** The URL parameter that carries the menu code of the screen being opened. */
export const MENU_ID_PARAM = 'menuId';

/** The menu codes of the new-software screens (`MENUM.MENU_CODE`), as the backend's `MenuCodes`. */
export const MENU_CODES = {
  companyList: 'NS-COMPLIST',
  branchList: 'NS-BRANCHLIST',
  profile: 'NS-EMPPROFILE',
  employeeList: 'NS-EMPLIST',
  holidayList: 'NS-HOLIDAYLIST',
} as const;

/** The route data key that names the menu a screen route belongs to; the menu access guard checks it. */
export const MENU_CODE_DATA = 'menuCode';

/** The route data key that names the menus of the screens a screen links to; their rights load with the screen's. */
export const RELATED_MENU_CODES_DATA = 'relatedMenuCodes';

/** Shown instead of a screen the user has no view right on. */
export const NO_ACCESS_TEXT = 'You do not have access to this screen.';
