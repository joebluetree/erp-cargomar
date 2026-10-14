import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports, HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmSelectImports } from '@spartan-ng/helm/select';

/**
 * The shared modal dialog and the select (the dropdown LOV field), asserted once here so screens that use them only check
 * their own content. See kb/architecture/frontend.md, "Dialogs and LOV fields".
 */
@Component({
  imports: [HlmDialogImports, HlmButtonImports],
  template: `
    <hlm-dialog-header>
      <h2 hlmDialogTitle>Sample dialog</h2>
    </hlm-dialog-header>
    <input aria-label="Inside" />
    <hlm-dialog-footer>
      <button hlmBtn type="button" (click)="ref.close()">Close it</button>
    </hlm-dialog-footer>
  `,
})
class SampleDialog {
  protected readonly ref = inject(BrnDialogRef);
}

interface Item {
  id: string;
  name: string;
}

@Component({
  imports: [HlmSelectImports, ReactiveFormsModule],
  template: `
    <button type="button" id="opener" (click)="open()">Open</button>
    <hlm-select [formControl]="choice" [itemToString]="toName" [isItemEqualToValue]="sameId">
      <hlm-select-trigger buttonId="pick" class="w-full">
        <hlm-select-value placeholder="Pick one" />
      </hlm-select-trigger>
      <hlm-select-content *hlmSelectPortal>
        @for (item of items; track item.id) {
          <hlm-select-item [value]="item">{{ item.name }}</hlm-select-item>
        }
      </hlm-select-content>
    </hlm-select>
  `,
})
class Host {
  private readonly dialogs = inject(HlmDialogService);
  readonly items: Item[] = [
    { id: 'b-1', name: 'Kochi' },
    { id: 'b-2', name: 'Mumbai Sea' },
    { id: 'b-3', name: 'Navi Mumbai' },
  ];
  readonly choice = new FormControl<Item | null>({ id: 'b-1', name: 'Kochi' });
  readonly toName = (item: Item) => item.name;
  readonly sameId = (a: Item, b: Item | null | undefined) => a.id === b?.id;
  open() {
    this.dialogs.open(SampleDialog);
  }
}

describe('shared dialog and select', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  const settle = async (fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
  };

  afterEach(() => document.body.replaceChildren());

  describe('dialog', () => {
    it('is a modal dialog named by its title, takes the focus, and gives it back when closed', async () => {
      const fixture = await render();
      const opener = document.getElementById('opener') as HTMLButtonElement;
      opener.focus();

      opener.click();
      await settle(fixture);

      const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).toBeTruthy();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      const title = dialog.querySelector('[hlmDialogTitle]')!;
      expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
      expect(dialog.contains(document.activeElement)).toBe(true);

      (Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Close it') as HTMLButtonElement).click();
      await settle(fixture);
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(document.activeElement).toBe(opener);
    });

    it('closes with Escape and with its close button', async () => {
      const fixture = await render();

      document.getElementById('opener')!.click();
      await settle(fixture);
      document.querySelector('[role="dialog"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle(fixture);
      expect(document.querySelector('[role="dialog"]')).toBeNull();

      document.getElementById('opener')!.click();
      await settle(fixture);
      const close = Array.from(document.querySelectorAll('[role="dialog"] button')).find((b) => b.textContent?.trim() === 'Close');
      (close as HTMLButtonElement).click();
      await settle(fixture);
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    });
  });

  describe('select', () => {
    const trigger = () => document.getElementById('pick') as HTMLButtonElement;
    const rows = () => Array.from(document.querySelectorAll<HTMLElement>('hlm-select-item'));

    async function openList(fixture: Parameters<typeof settle>[0]) {
      trigger().click();
      await settle(fixture);
    }

    it('is a button showing the chosen name, with no text input and no clear button', async () => {
      await render();

      expect(trigger().tagName).toBe('BUTTON');
      expect(trigger().textContent?.trim()).toBe('Kochi');
      const select = document.querySelector('hlm-select')!;
      expect(select.querySelector('input')).toBeNull();
      expect(Array.from(select.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'))).toEqual([null]);
    });

    it('opens the list when activated and puts the picked row into the form control', async () => {
      const fixture = await render();

      await openList(fixture);
      expect(rows().map((r) => r.textContent?.trim())).toEqual(['Kochi', 'Mumbai Sea', 'Navi Mumbai']);
      rows()[2].click();
      await settle(fixture);

      expect(fixture.componentInstance.choice.value).toEqual({ id: 'b-3', name: 'Navi Mumbai' });
      expect(trigger().textContent?.trim()).toBe('Navi Mumbai');
      expect(document.querySelectorAll('hlm-select-item')).toHaveLength(0); // the list closed
    });

    it('separates the rows with a border line, none after the last, and gives them the hand pointer', async () => {
      const fixture = await render();

      await openList(fixture);

      expect(rows()).toHaveLength(3);
      for (const row of rows()) {
        expect(Array.from(row.classList)).toEqual(
          expect.arrayContaining(['border-b', 'border-border', 'last:border-b-0', 'cursor-pointer']),
        );
      }
      expect(rows().at(-1)).toBe(rows().at(-1)!.parentElement!.lastElementChild);
    });
  });
});
