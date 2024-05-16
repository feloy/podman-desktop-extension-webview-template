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

/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterEach, beforeEach, expect, test, vi, describe } from 'vitest';
import { Studio } from './studio';
import { type ExtensionContext, EventEmitter, version } from '@podman-desktop/api';

import * as fs from 'node:fs';

vi.mock('./managers/modelsManager');

const mockedExtensionContext = {
  subscriptions: [],
  storagePath: 'dummy-storage-path',
} as unknown as ExtensionContext;

const studio = new Studio(mockedExtensionContext);

const mocks = vi.hoisted(() => ({
  listContainers: vi.fn(),
  getContainerConnections: vi.fn(),
  postMessage: vi.fn(),
  consoleWarnMock: vi.fn(),
  consoleLogMock: vi.fn(),
}));

vi.mock('../package.json', () => ({
  engines: {
    'podman-desktop': '>=1.0.0',
  },
}));

vi.mock('@podman-desktop/api', async () => {
  return {
    version: '1.8.0',
    fs: {
      createFileSystemWatcher: () => ({
        onDidCreate: vi.fn(),
        onDidDelete: vi.fn(),
        onDidChange: vi.fn(),
      }),
    },
    EventEmitter: vi.fn(),
    Uri: class {
      static joinPath = () => ({ fsPath: '.' });
    },
    window: {
      createWebviewPanel: () => ({
        webview: {
          html: '',
          onDidReceiveMessage: vi.fn(),
          postMessage: mocks.postMessage,
        },
        onDidChangeViewState: vi.fn(),
      }),
    },
    containerEngine: {
      onEvent: vi.fn(),
      listContainers: mocks.listContainers,
    },
    provider: {
      onDidRegisterContainerConnection: vi.fn(),
      onDidUpdateContainerConnection: vi.fn(),
      getContainerConnections: mocks.getContainerConnections,
    },
    commands: {
      registerCommand: vi.fn(),
    },
    Disposable: {
      create: vi.fn(),
    },
  };
});

/// mock console.log
const originalConsoleLog = console.log;

beforeEach(() => {
  vi.clearAllMocks();
  console.log = mocks.consoleLogMock;
  console.warn = mocks.consoleWarnMock;

  vi.mocked(EventEmitter).mockReturnValue({
    event: vi.fn(),
    fire: vi.fn(),
  } as unknown as EventEmitter<unknown>);

  mocks.postMessage.mockResolvedValue(undefined);
});

afterEach(() => {
  console.log = originalConsoleLog;
});

test('check activate', async () => {
  expect(version).toBe('1.8.0');
  mocks.listContainers.mockReturnValue([]);
  mocks.getContainerConnections.mockReturnValue([]);
  vi.spyOn(fs.promises, 'readFile').mockImplementation(() => {
    return Promise.resolve('<html></html>');
  });
  await studio.activate();

  // expect the activate method to be called on the studio class
  expect(mocks.consoleLogMock).toBeCalledWith('starting My extension');
});

describe('version checker', () => {
  test('check activate incompatible', async () => {
    (version as string) = '0.7.0';
    await expect(studio.activate()).rejects.toThrowError(
      'Extension is not compatible with Podman Desktop version below 1.0.0. Current 0.7.0',
    );
  });

  test('version undefined', async () => {
    (version as string | undefined) = undefined;
    await expect(studio.activate()).rejects.toThrowError(
      'Extension is not compatible with Podman Desktop version below 1.0.0. Current unknown',
    );
  });

  test('check activate nighties value', async () => {
    (version as string) = 'v0.0.202404030805-3cb4544';
    await studio.activate();

    expect(mocks.consoleWarnMock).toHaveBeenCalledWith('nightlies version are not subject to version verification.');
  });
});

test('check deactivate ', async () => {
  await studio.deactivate();

  // expect the deactivate method to be called on the studio class
  expect(mocks.consoleLogMock).toBeCalledWith('stopping AI Lab extension');
});
