/**********************************************************************
 * Copyright (C) 2024 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import type { Locator, Page } from '@playwright/test';
import { expect as playExpect } from '@playwright/test';
import { afterAll, beforeAll, beforeEach, describe, test } from 'vitest';
import type { DashboardPage, SettingsBar, RunnerTestContext } from '@podman-desktop/tests-playwright';
import {
  NavigationBar,
  SettingsExtensionsPage,
  WelcomePage,
  PodmanDesktopRunner,
} from '@podman-desktop/tests-playwright';

const MY_EXTENSION_OCI_IMAGE: string = 'ghcr.io/containers/podman-desktop-extension-my:nightly';

let pdRunner: PodmanDesktopRunner;
let page: Page;

let navigationBar: NavigationBar;
let dashboardPage: DashboardPage;
let settingsBar: SettingsBar;
let extensionsPage: SettingsExtensionsPage;

beforeAll(async () => {
  pdRunner = new PodmanDesktopRunner();
  page = await pdRunner.start();
  pdRunner.setVideoAndTraceName('podman-desktop-extension-my-installation');

  await new WelcomePage(page).handleWelcomePage(true);
  navigationBar = new NavigationBar(page);
});

beforeEach<RunnerTestContext>(async ctx => {
  ctx.pdRunner = pdRunner;
});

afterAll(async () => {
  await pdRunner.close();
});

describe(`My extension installation and verification`, async () => {
  describe(`My extension installation`, async () => {
    test(`Open Settings -> Extensions page`, async () => {
      dashboardPage = await navigationBar.openDashboard();
      await playExpect(dashboardPage.mainPage).toBeVisible();
      settingsBar = await navigationBar.openSettings();
      await playExpect(settingsBar.extensionsTab).toBeVisible();
      await settingsBar.extensionsTab.click();
      extensionsPage = new SettingsExtensionsPage(page);
      await playExpect(extensionsPage.imageInstallBox).toBeVisible();
    });
    test(`Install My extension`, async () => {
      await extensionsPage.installExtensionFromOCIImage(MY_EXTENSION_OCI_IMAGE);
    });
    test(`Verify My extension in extension list`, async () => {
      const aiStudioExtension: Locator = extensionsPage.installedExtensions.getByLabel('my');
      await playExpect(aiStudioExtension).toBeVisible({ timeout: 60_000 });
      await playExpect(aiStudioExtension.getByLabel('Extension Status Label')).toHaveText('ACTIVE', {
        timeout: 10_000,
      });
    });
  });
  describe(`My extension verification`, async () => {
    test(`Verify My is present in notification bar and open it`, async () => {
      const myNavBarItem: Locator = navigationBar.navigationLocator.getByLabel('My');
      await playExpect(myNavBarItem).toBeVisible();
      await myNavBarItem.click();
    });
    test(`Verify My is running`, async () => {
      const myWebview: Locator = page.getByLabel('Webview My');
      await playExpect(myWebview).toBeVisible();
    });
  });
});
