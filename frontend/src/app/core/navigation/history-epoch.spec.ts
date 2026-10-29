import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HISTORY_EPOCH_STATE, HistoryEpoch, historyEpochGuard } from './history-epoch';

@Component({ template: 'stub' })
class Stub {}

describe('HistoryEpoch', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  async function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            canActivateChild: [historyEpochGuard],
            children: [
              { path: '', pathMatch: 'full', component: Stub },
              { path: 'a', component: Stub },
              { path: 'b', component: Stub },
            ],
          },
        ]),
        provideLocationMocks(),
      ],
    });
    TestBed.inject(Router).setUpLocationChangeListener();
    const epoch = TestBed.inject(HistoryEpoch);
    const harness = await RouterTestingHarness.create();
    const location = TestBed.inject(Location);
    const router = TestBed.inject(Router);
    const settle = async () => {
      await new Promise((r) => setTimeout(r));
      await harness.fixture.whenStable();
    };
    return { epoch, harness, location, router, settle };
  }

  it('stamps every history entry with the epoch, keeping the router state', async () => {
    const { epoch, harness, location } = await setup();

    await harness.navigateByUrl('/a');

    const state = location.getState() as Record<string, unknown>;
    expect(state[HISTORY_EPOCH_STATE]).toBe(epoch.value);
    expect(state['navigationId']).toBeDefined();
  });

  it('lets Back work among the screens of one epoch', async () => {
    const { harness, location, router, settle } = await setup();
    await harness.navigateByUrl('/a');
    await harness.navigateByUrl('/b');

    location.back();
    await settle();

    expect(router.url).toBe('/a');
  });

  it('opens the Dashboard for a Back to a screen opened before the epoch was reset', async () => {
    const { epoch, harness, location, router, settle } = await setup();
    await harness.navigateByUrl('/a');
    await harness.navigateByUrl('/b');

    // The branch switch: a new epoch, and the Dashboard in place of the current screen.
    epoch.reset();
    await router.navigateByUrl('/', { replaceUrl: true });
    await settle();

    location.back();
    await settle();
    expect(router.url).toBe('/');

    // Again: the Dashboard each time, never a screen of the old branch.
    location.back();
    await settle();
    expect(router.url).toBe('/');
  });

  it('keeps Back working among the screens opened after the reset', async () => {
    const { epoch, harness, location, router, settle } = await setup();
    await harness.navigateByUrl('/a');
    epoch.reset();
    await router.navigateByUrl('/', { replaceUrl: true });
    await harness.navigateByUrl('/b');

    location.back();
    await settle();

    expect(router.url).toBe('/');
    expect((location.getState() as Record<string, unknown>)[HISTORY_EPOCH_STATE]).toBe(epoch.value);
  });

  it('keeps the epoch across a reload and starts a new one on reset', async () => {
    const { epoch } = await setup();
    const first = epoch.value;

    TestBed.resetTestingModule();
    const { epoch: reloaded } = await setup();
    expect(reloaded.value).toBe(first);

    reloaded.reset();
    expect(reloaded.value).not.toBe(first);
  });
});
