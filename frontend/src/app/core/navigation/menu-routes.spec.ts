import { Route, Routes } from '@angular/router';
import { routes } from '../../app.routes';
import { menuAccessGuard } from './menu-access.guard';
import { MENU_CODES, MENU_CODE_DATA, RELATED_MENU_CODES_DATA } from './menu.model';

/** Every screen route under a menu-guarded parent, with the menu code it declares (admin-user-rights design D5). */
async function guardedScreens(): Promise<Record<string, unknown>> {
  const found: Record<string, unknown> = {};
  const shell = routes.find((r) => r.path === '' && r.children)!;
  for (const parent of shell.children!.filter((r: Route) => r.canActivateChild?.includes(menuAccessGuard))) {
    const children = (await (parent.loadChildren as () => Promise<Routes>)()) as Routes;
    for (const child of children) {
      const related = child.data?.[RELATED_MENU_CODES_DATA];
      found[[parent.path, child.path].filter(Boolean).join('/')] = related ? [child.data?.[MENU_CODE_DATA], related] : child.data?.[MENU_CODE_DATA];
    }
  }
  return found;
}

describe('menu routes', () => {
  it('names the menu of every guarded screen and its related menus; an employee\'s profile belongs to the Profile and a branch\'s holidays to the Holiday List', async () => {
    expect(await guardedScreens()).toEqual({
      'reports/companies': MENU_CODES.companyList,
      'reports/branches': [MENU_CODES.branchList, [MENU_CODES.holidayList]],
      'reports/branches/:id/holidays': MENU_CODES.holidayList,
      'admin/profile': MENU_CODES.profile,
      'admin/employees': [MENU_CODES.employeeList, [MENU_CODES.profile]],
      'admin/employees/:id': MENU_CODES.profile,
      'admin/holidays': MENU_CODES.holidayList,
    });
  });
});
