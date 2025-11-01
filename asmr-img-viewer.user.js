// ==UserScript==
// @name        asmr.one image viewer
// @match       https://asmr.one/*
// @grant       GM_getValue
// @grant       GM_setValue
// @version     1.0
// @author      ojou-sama
// @description image viewer, asmr.one webscript
// ==/UserScript==

(function() {
    'use strict';

    // ========== style injection ==========
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        /* Settings Modal */
        .asmr-nav-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 20000;
        }

        .asmr-nav-modal-panel {
            background: #2a2a2a;
            color: white;
            padding: 24px;
            border-radius: 8px;
            max-width: 480px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 1em;
        }

        .asmr-nav-modal-title {
            margin: 0;
            line-height: 1;
            font-size: 16px;
            font-weight: bold;
            color: white;
        }

        .asmr-nav-settings-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-block: 4px;
        }

        .asmr-nav-setting-item {
        }

        .asmr-nav-setting-label {
            display: flex;
            align-items: flex-start;
            cursor: pointer;
            user-select: none;
        }

        .asmr-nav-setting-checkbox {
            margin-right: 8px;
            margin-top: 2px;
            cursor: pointer;
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }

        .asmr-nav-setting-text {
            font-weight: bold;
            margin-bottom: 2px;
            font-size: 13px;
        }

        .asmr-nav-setting-desc {
            font-size: 11px;
            opacity: 0.7;
            line-height: 1.3;
        }

        .asmr-nav-keyboard-info {
            background: rgba(255, 255, 255, 0.05);
            padding: 12px;
            border-radius: 4px;
            font-size: 12px;
            line-height: 1.5;
        }

        .asmr-nav-keyboard-info-title {
            font-weight: bold;
        }

        .asmr-nav-modal-close-btn {
            background: #4a4a4a;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            width: 100%;
        }

        .asmr-nav-modal-close-btn:hover {
            background: #5a5a5a;
        }

        /* Image Viewer */
        .asmr-nav-viewer-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            cursor: pointer;
        }

        .asmr-nav-viewer-img {
            max-width: calc(100% - 320px);
            max-height: 90%;
            object-fit: contain;
            cursor: default;
            transition: opacity 0.15s ease;
        }

        .asmr-nav-info-overlay {
            position: absolute;
            bottom: 20px;
            right: 20px;
            color: white;
            font-size: 14px;
            text-align: right;
            background: rgba(0, 0, 0, 0.7);
            padding: 10px 16px;
            border-radius: 4px;
            pointer-events: none;
            z-index: 2;
        }

        .asmr-nav-info-overlay[data-hidden="true"] {
            display: none;
        }

        .asmr-nav-info-index {
            margin-bottom: 5px;
        }

        .asmr-nav-info-path {
            max-width: 400px;
            word-break: break-word;
            font-size: 12px;
            opacity: 0.8;
        }

        /* Sidebar */
        .asmr-nav-sidebar {
            position: absolute;
            top: 0;
            right: 0;
            width: 300px;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 20px;
            box-sizing: border-box;
            font-size: 13px;
            z-index: 1;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        .asmr-nav-sidebar::-webkit-scrollbar {
            display: none;
        }

        .asmr-nav-button-container {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
        }

        .asmr-nav-sidebar-btn {
            width: calc(50% - 4px);
            padding: 8px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .asmr-nav-sidebar-btn:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        /* Folder Tree */
        .asmr-nav-folder-item {
            padding: 5px;
            cursor: pointer;
            user-select: none;
            display: flex;
            align-items: baseline;
        }

        .asmr-nav-folder-item:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .asmr-nav-folder-toggle {
            margin-right: 5px;
            flex-shrink: 0;
        }

        .asmr-nav-folder-name {
            font-weight: bold;
            word-break: break-word;
            flex: 1;
            min-width: 0;
        }

        .asmr-nav-folder-count {
            opacity: 0.6;
            font-size: 11px;
            white-space: nowrap;
            flex-shrink: 0;
            margin-left: 4px;
        }

        .asmr-nav-file-item {
            padding: 4px 5px;
            cursor: pointer;
            user-select: none;
            word-break: break-word;
        }

        .asmr-nav-file-item:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .asmr-nav-file-item[data-active="true"] {
            background: rgba(255, 255, 255, 0.2);
            font-weight: bold;
        }

        .asmr-nav-file-item[data-active="true"]:hover {
            background: rgba(255, 255, 255, 0.2);
        }
    `;
    document.head.appendChild(styleEl);

    // ========== state ==========
    let allImages = null;
    let currentWorkId = null;
    let workTreeClickHandler = null;
    let currentImageIndex = 0;
    let preloadTimeout = null;
    let openFolders = new Set();
    let currentViewerState = null;

    // ========== settings ==========
    const settings = {
        navigateAllImages: GM_getValue('navigateAllImages', true),
        showAllFolders: GM_getValue('showAllFolders', true),
        loopNavigation: GM_getValue('loopNavigation', true),
        showImageInfo: GM_getValue('showImageInfo', true),
        autoCloseFolders: GM_getValue('autoCloseFolders', true)
    };

    function saveSetting(key, value) {
        settings[key] = value;
        GM_setValue(key, value);
    }

    // ========== settings modal ==========
    function openSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'asmr-nav-modal-overlay';

        const panel = document.createElement('div');
        panel.className = 'asmr-nav-modal-panel';

        const title = document.createElement('h2');
        title.textContent = 'Settings';
        title.className = 'asmr-nav-modal-title';

        const settingsContainer = document.createElement('div');
        settingsContainer.className = 'asmr-nav-settings-container';

        settingsContainer.appendChild(createSettingCheckbox(
            'Navigate all images',
            'Arrow keys navigate through all images. Off: limited to current folder.',
            settings.navigateAllImages,
            (checked) => {
                saveSetting('navigateAllImages', checked);
                if (currentViewerState) {
                    rebuildViewer();
                }
            }
        ));

        settingsContainer.appendChild(createSettingCheckbox(
            'Loop navigation',
            'After last image, loop back to first (and vice versa).',
            settings.loopNavigation,
            (checked) => saveSetting('loopNavigation', checked)
        ));

        settingsContainer.appendChild(createSettingCheckbox(
            'Show all folders',
            'Display all folders in sidebar. Off: only current folder.',
            settings.showAllFolders,
            (checked) => {
                saveSetting('showAllFolders', checked);
                if (currentViewerState) {
                    updateSidebar(
                        currentViewerState.sidebar,
                        currentViewerState.allImages,
                        currentViewerState.currentIndex,
                        currentViewerState.onNavigate
                    );
                }
            }
        ));

        settingsContainer.appendChild(createSettingCheckbox(
            'Auto-close folders',
            'Close other folders when navigating to new image.',
            settings.autoCloseFolders,
            (checked) => saveSetting('autoCloseFolders', checked)
        ));

        settingsContainer.appendChild(createSettingCheckbox(
            'Show image info',
            'Display info overlay with position and file path.',
            settings.showImageInfo,
            (checked) => {
                saveSetting('showImageInfo', checked);
                const existingViewer = document.getElementById('image-viewer-modal');
                if (existingViewer) {
                    const infoOverlay = existingViewer.querySelector('[data-info-overlay]');
                    if (infoOverlay) {
                        infoOverlay.setAttribute('data-hidden', !checked);
                    }
                }
            }
        ));

        const keyboardInfo = document.createElement('div');
        keyboardInfo.className = 'asmr-nav-keyboard-info';
        keyboardInfo.innerHTML = `
            <div class="asmr-nav-keyboard-info-title">Keyboard Shortcuts</div>
            <div><strong>←/→</strong> Previous/next image</div>
            <div><strong>Esc</strong> Close viewer</div>
        `;

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.className = 'asmr-nav-modal-close-btn';
        closeButton.addEventListener('click', () => {
            modal.remove();
        });

        panel.appendChild(title);
        panel.appendChild(settingsContainer);
        panel.appendChild(keyboardInfo);
        panel.appendChild(closeButton);
        modal.appendChild(panel);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        panel.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        document.body.appendChild(modal);
    }

    function createSettingCheckbox(label, description, checked, onChange) {
        const container = document.createElement('div');
        container.className = 'asmr-nav-setting-item';

        const labelEl = document.createElement('label');
        labelEl.className = 'asmr-nav-setting-label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = checked;
        checkbox.className = 'asmr-nav-setting-checkbox';
        checkbox.addEventListener('change', () => {
            onChange(checkbox.checked);
        });

        const textContainer = document.createElement('div');

        const labelText = document.createElement('div');
        labelText.textContent = label;
        labelText.className = 'asmr-nav-setting-text';

        const desc = document.createElement('div');
        desc.textContent = description;
        desc.className = 'asmr-nav-setting-desc';

        textContainer.appendChild(labelText);
        textContainer.appendChild(desc);

        labelEl.appendChild(checkbox);
        labelEl.appendChild(textContainer);
        container.appendChild(labelEl);

        return container;
    }

    // ========== api & data ==========
    function getWorkId() {
        const path = location.pathname;
        const match = path.match(/\/work\/RJ(\d+)/);
        return match ? match[1] : null;
    }

    async function callApi(endpoint) {
        const host = `api.${location.host.match(/(?:[^.]+\.)?([^.]+\.[^.]+)/)[1]}`;
        const url = `https://${host}/api/${endpoint}`;

        const response = await fetch(url, {
            headers: {
                'accept': 'application/json, text/plain, */*'
            }
        });

        if (!response.ok) throw new Error(`API call failed: ${response.status}`);
        return await response.json();
    }

    function interceptXHR() {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._url = url;
            return originalOpen.apply(this, [method, url, ...args]);
        };

        XMLHttpRequest.prototype.send = function(...args) {
            this.addEventListener('load', function() {
                if (this._url && this._url.match(/\/api\/tracks\/\d+\?v=/)) {
                    try {
                        const data = JSON.parse(this.responseText);
                        const workId = getWorkId();
                        if (workId && this._url.includes(workId)) {
                            allImages = extractAllImages(sortFileTree(data));
                            currentWorkId = workId;
                            console.log('intercepted XHR tracks API, cached', allImages.length, 'images');
                        }
                    } catch (e) {}
                }
            });
            return originalSend.apply(this, args);
        };
    }

    interceptXHR();

    // ========== file tree processing ==========
    function sortFileTree(items) {
        const sorted = [...items].sort((a, b) => a.title.localeCompare(b.title));
        return sorted.map(item => {
            if (item.type === 'folder' && item.children) {
                return {
                    ...item,
                    children: sortFileTree(item.children)
                };
            }
            return item;
        });
    }

    function extractAllImages(items, path = []) {
        const images = [];
        for (const item of items) {
            if (item.type === 'folder') {
                images.push(...extractAllImages(item.children || [], [...path, item.title]));
            } else if (item.type === 'image') {
                images.push({
                    filename: item.title,
                    url: item.mediaStreamUrl,
                    path: path,
                    fullPath: [...path, item.title].join(' / ')
                });
            }
        }
        return images;
    }

    function getCurrentPath() {
        const params = new URLSearchParams(location.search);
        const pathParam = params.get('path');
        if (!pathParam) return [];

        try {
            return JSON.parse(decodeURIComponent(pathParam));
        } catch {
            return [];
        }
    }

    function filterImagesInCurrentFolder(images) {
        const currentPath = getCurrentPath();
        return images.filter(img => {
            if (img.path.length !== currentPath.length) return false;
            return img.path.every((folder, i) => folder === currentPath[i]);
        });
    }

    // ========== image utilities ==========
    function getImagesInSameFolder(images, targetImg) {
        return images.filter(i =>
            i.path.length === targetImg.path.length &&
            i.path.every((p, idx) => p === targetImg.path[idx])
        );
    }

    function getNavigableImages(allImages, currentIndex) {
        if (settings.navigateAllImages) {
            return allImages;
        } else {
            const currentImg = allImages[currentIndex];
            return getImagesInSameFolder(allImages, currentImg);
        }
    }

    function getImageIndices(images, currentIndex) {
        const currentImg = images[currentIndex];
        const imagesInFolder = getImagesInSameFolder(allImages, currentImg);

        const folderIndex = imagesInFolder.findIndex(i => i.filename === currentImg.filename) + 1;
        const folderTotal = imagesInFolder.length;
        const totalIndex = allImages.findIndex(i => i.filename === currentImg.filename) + 1;
        const totalCount = allImages.length;

        return { folderIndex, folderTotal, totalIndex, totalCount };
    }

    function preloadAdjacentImages(images, currentIndex) {
        const nextIndex = (currentIndex + 1 + images.length) % images.length;
        const prevIndex = (currentIndex - 1 + images.length) % images.length;

        const preloadNext = new Image();
        preloadNext.src = images[nextIndex].url;

        const preloadPrev = new Image();
        preloadPrev.src = images[prevIndex].url;
    }

    // ========== formatting ==========
    function formatIndexText(folderIndex, folderTotal, totalIndex, totalCount) {
        return `${folderIndex} / ${folderTotal} (${totalCount})`;
    }

    function formatPathText(fullPath) {
        return fullPath;
    }

    // ========== ui components ==========
    function createInfoOverlay(images, currentIndex) {
        const infoContainer = document.createElement('div');
        infoContainer.setAttribute('data-info-overlay', 'true');
        infoContainer.className = 'asmr-nav-info-overlay';
        infoContainer.setAttribute('data-hidden', !settings.showImageInfo);

        const indexText = document.createElement('div');
        indexText.className = 'asmr-nav-info-index';

        const pathText = document.createElement('div');
        pathText.className = 'asmr-nav-info-path';

        infoContainer.appendChild(indexText);
        infoContainer.appendChild(pathText);

        updateInfoOverlay(infoContainer, images, currentIndex);

        return infoContainer;
    }

    function updateInfoOverlay(infoContainer, images, currentIndex) {
        if (!settings.showImageInfo) return;

        const { folderIndex, folderTotal, totalIndex, totalCount } = getImageIndices(images, currentIndex);
        const currentImg = images[currentIndex];

        const indexText = formatIndexText(folderIndex, folderTotal, totalIndex, totalCount);
        const pathText = formatPathText(currentImg.fullPath);

        infoContainer.children[0].textContent = indexText;
        infoContainer.children[1].textContent = pathText;
    }

    function createSettingsButton() {
        const button = document.createElement('button');
        button.textContent = 'Settings';
        button.className = 'asmr-nav-sidebar-btn';

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            openSettingsModal();
        });

        return button;
    }

    function createExpandCollapseButton(sidebar) {
        const button = document.createElement('button');
        button.textContent = 'Expand All';
        button.className = 'asmr-nav-sidebar-btn';

        let allExpanded = false;

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            allExpanded = !allExpanded;
            button.textContent = allExpanded ? 'Collapse All' : 'Expand All';
            toggleAllFolders(sidebar, allExpanded);
        });

        return button;
    }

    function toggleAllFolders(sidebar, expand) {
        const treeContainer = sidebar.children[1];
        const allFolders = treeContainer.querySelectorAll('div');

        allFolders.forEach(el => {
            const toggle = el.children[0];
            if (toggle && (toggle.textContent === '[＋]' || toggle.textContent === '[ー]')) {
                const contentEl = el.nextElementSibling;
                if (contentEl) {
                    contentEl.style.display = expand ? 'block' : 'none';
                    toggle.textContent = expand ? '[ー]' : '[＋]';

                    const folderPath = getFolderPath(el);
                    if (expand) {
                        openFolders.add(folderPath);
                    } else {
                        openFolders.delete(folderPath);
                    }
                }
            }
        });
    }

    function getFolderPath(folderEl) {
        const folderName = folderEl.children[1]?.textContent || '';
        return folderName;
    }

    function createSidebar(images, currentIndex, onNavigate) {
        const sidebar = document.createElement('div');
        sidebar.className = 'asmr-nav-sidebar';

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'asmr-nav-button-container';

        const expandButton = createExpandCollapseButton(sidebar);
        const settingsButton = createSettingsButton();

        buttonContainer.appendChild(expandButton);
        buttonContainer.appendChild(settingsButton);
        sidebar.appendChild(buttonContainer);

        const imagesToShow = settings.showAllFolders ? images : getImagesInSameFolder(allImages, images[currentIndex]);
        const folderTree = buildFolderTree(imagesToShow);

        const treeContainer = document.createElement('div');
        renderFolderTree(folderTree, treeContainer, imagesToShow, images, currentIndex, onNavigate);

        sidebar.appendChild(treeContainer);

        sidebar.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        return sidebar;
    }

    function buildFolderTree(images) {
        const tree = {};

        for (const img of images) {
            let current = tree;

            for (const folder of img.path) {
                if (!current[folder]) {
                    current[folder] = { _images: [], _folders: {} };
                }
                current = current[folder]._folders;
            }

            if (img.path.length > 0) {
                let parent = tree;
                for (let i = 0; i < img.path.length - 1; i++) {
                    parent = parent[img.path[i]]._folders;
                }
                parent[img.path[img.path.length - 1]]._images.push(img);
            } else {
                if (!tree._root) tree._root = { _images: [], _folders: {} };
                tree._root._images.push(img);
            }
        }

        return tree;
    }

    function countFolderChildren(folder) {
        const imageCount = folder._images.length;
        const subfolderCount = Object.keys(folder._folders).length;
        return imageCount + subfolderCount;
    }

    function renderFolderTree(tree, container, sidebarImages, navImages, currentIndex, onNavigate, depth = 0, pathPrefix = '') {
        const currentImg = navImages[currentIndex];

        if (tree._root) {
            for (const img of tree._root._images) {
                const item = createFileItem(img, sidebarImages, navImages, currentImg, onNavigate);
                item.style.paddingLeft = `${depth * 15}px`;
                container.appendChild(item);
            }
        }

        const folders = Object.keys(tree).filter(k => k !== '_root').sort();

        for (const folderName of folders) {
            const folder = tree[folderName];
            const folderPath = pathPrefix ? `${pathPrefix}/${folderName}` : folderName;
            const folderEl = createFolderItem(folderName, folder, depth, folderPath);
            container.appendChild(folderEl);

            const contentEl = document.createElement('div');
            const isOpen = openFolders.has(folderPath);
            contentEl.style.display = isOpen ? 'block' : 'none';

            for (const img of folder._images) {
                const item = createFileItem(img, sidebarImages, navImages, currentImg, onNavigate);
                item.style.paddingLeft = `${(depth + 1) * 15}px`;
                contentEl.appendChild(item);
            }

            renderFolderTree(folder._folders, contentEl, sidebarImages, navImages, currentIndex, onNavigate, depth + 1, folderPath);

            container.appendChild(contentEl);

            folderEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const wasOpen = contentEl.style.display !== 'none';
                contentEl.style.display = wasOpen ? 'none' : 'block';
                folderEl.children[0].textContent = wasOpen ? '[＋]' : '[ー]';

                if (wasOpen) {
                    openFolders.delete(folderPath);
                } else {
                    openFolders.add(folderPath);
                }
            });

            const shouldAutoOpen = currentImg.path.includes(folderName);
            if (shouldAutoOpen) {
                contentEl.style.display = 'block';
                folderEl.children[0].textContent = '[ー]';
                if (!settings.autoCloseFolders) {
                    openFolders.add(folderPath);
                }
            }
        }
    }

    function createFolderItem(name, folder, depth, folderPath) {
        const el = document.createElement('div');
        el.className = 'asmr-nav-folder-item';
        el.style.paddingLeft = `${depth * 15}px`;

        const isOpen = openFolders.has(folderPath);

        const toggle = document.createElement('span');
        toggle.textContent = isOpen ? '[ー]' : '[＋]';
        toggle.className = 'asmr-nav-folder-toggle';

        const text = document.createElement('span');
        text.textContent = name;
        text.className = 'asmr-nav-folder-name';

        const count = document.createElement('span');
        const childCount = countFolderChildren(folder);
        count.textContent = ` (${childCount})`;
        count.className = 'asmr-nav-folder-count';

        el.appendChild(toggle);
        el.appendChild(text);
        el.appendChild(count);

        return el;
    }

    function createFileItem(img, sidebarImages, navImages, currentImg, onNavigate) {
        const el = document.createElement('div');
        el.className = 'asmr-nav-file-item';

        const isActive = img.filename === currentImg.filename &&
                        img.path.length === currentImg.path.length &&
                        img.path.every((p, i) => p === currentImg.path[i]);

        el.setAttribute('data-active', isActive);
        el.textContent = img.filename;

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetIndex = navImages.findIndex(i =>
                i.filename === img.filename &&
                i.path.length === img.path.length &&
                i.path.every((p, idx) => p === img.path[idx])
            );
            if (targetIndex !== -1) {
                onNavigate(targetIndex);
            }
        });

        return el;
    }

    function updateSidebar(sidebar, images, currentIndex, onNavigate) {
        while (sidebar.children.length > 1) {
            sidebar.removeChild(sidebar.lastChild);
        }

        if (settings.autoCloseFolders) {
            openFolders.clear();
        }

        const imagesToShow = settings.showAllFolders ? images : getImagesInSameFolder(allImages, images[currentIndex]);
        const folderTree = buildFolderTree(imagesToShow);

        const treeContainer = document.createElement('div');
        renderFolderTree(folderTree, treeContainer, imagesToShow, images, currentIndex, onNavigate);

        sidebar.appendChild(treeContainer);

        const activeItem = Array.from(treeContainer.querySelectorAll('div')).find(el =>
            el.getAttribute('data-active') === 'true'
        );
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    // ========== image viewer ==========
    function openImageViewer(images, startIndex) {
        currentImageIndex = startIndex;
        openFolders.clear();

        const modal = document.createElement('div');
        modal.id = 'image-viewer-modal';
        modal.className = 'asmr-nav-viewer-modal';

        const img = document.createElement('img');
        img.className = 'asmr-nav-viewer-img';

        img.onload = () => {
            const navigableImages = getNavigableImages(images, currentImageIndex);
            setTimeout(() => preloadAdjacentImages(navigableImages,
                navigableImages.findIndex(i => i.filename === images[currentImageIndex].filename)), 200);
        };

        img.src = images[currentImageIndex].url;

        const infoOverlay = createInfoOverlay(images, currentImageIndex);

        const onNavigate = (targetIndex) => {
            navigateToIndex(targetIndex, images, img, infoOverlay, sidebar);
        };

        const sidebar = createSidebar(images, currentImageIndex, onNavigate);

        currentViewerState = {
            allImages: images,
            currentIndex: currentImageIndex,
            sidebar: sidebar,
            onNavigate: onNavigate
        };

        modal.appendChild(img);
        modal.appendChild(infoOverlay);
        modal.appendChild(sidebar);
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeViewer();
            }
        });

        img.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        const handleKeydown = (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                navigateImage(-1, images, img, infoOverlay, sidebar);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                navigateImage(1, images, img, infoOverlay, sidebar);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeViewer();
            }
        };

        document.addEventListener('keydown', handleKeydown);

        function closeViewer() {
            document.removeEventListener('keydown', handleKeydown);
            currentViewerState = null;
            modal.remove();
        }
    }

    function rebuildViewer() {
        if (!currentViewerState) return;

        const modal = document.getElementById('image-viewer-modal');
        if (!modal) return;

        const img = modal.querySelector('.asmr-nav-viewer-img');
        const infoOverlay = modal.querySelector('[data-info-overlay]');
        const sidebar = modal.querySelector('.asmr-nav-sidebar');

        if (!img || !infoOverlay || !sidebar) return;

        updateSidebar(sidebar, currentViewerState.allImages, currentViewerState.currentIndex, currentViewerState.onNavigate);

        currentViewerState.sidebar = sidebar;
    }

    function navigateImage(direction, images, img, infoOverlay, sidebar) {
        const navigableImages = getNavigableImages(images, currentImageIndex);

        const currentImg = images[currentImageIndex];
        const navIndex = navigableImages.findIndex(i =>
            i.filename === currentImg.filename &&
            i.path.length === currentImg.path.length &&
            i.path.every((p, idx) => p === currentImg.path[idx])
        );

        if (navIndex === -1) return;

        let newNavIndex = navIndex + direction;

        if (settings.loopNavigation) {
            newNavIndex = (newNavIndex + navigableImages.length) % navigableImages.length;
        } else {
            if (newNavIndex < 0 || newNavIndex >= navigableImages.length) {
                return;
            }
        }

        const targetImg = navigableImages[newNavIndex];
        const targetIndex = images.findIndex(i =>
            i.filename === targetImg.filename &&
            i.path.length === targetImg.path.length &&
            i.path.every((p, idx) => p === targetImg.path[idx])
        );

        if (targetIndex !== -1) {
            navigateToIndex(targetIndex, images, img, infoOverlay, sidebar);
        }
    }

    function navigateToIndex(targetIndex, images, img, infoOverlay, sidebar) {
        currentImageIndex = targetIndex;

        if (currentViewerState) {
            currentViewerState.currentIndex = currentImageIndex;
        }

        img.style.opacity = '0.8';

        updateInfoOverlay(infoOverlay, images, currentImageIndex);

        const onNavigate = (newTargetIndex) => {
            navigateToIndex(newTargetIndex, images, img, infoOverlay, sidebar);
        };

        updateSidebar(sidebar, images, currentImageIndex, onNavigate);

        if (currentViewerState) {
            currentViewerState.onNavigate = onNavigate;
        }

        const newImg = new Image();
        newImg.onload = () => {
            img.src = newImg.src;
            img.style.opacity = '1';

            clearTimeout(preloadTimeout);
            preloadTimeout = setTimeout(() => {
                const navigableImages = getNavigableImages(images, currentImageIndex);
                const navIndex = navigableImages.findIndex(i =>
                    i.filename === images[currentImageIndex].filename &&
                    i.path.length === images[currentImageIndex].path.length &&
                    i.path.every((p, idx) => p === images[currentImageIndex].path[idx])
                );
                if (navIndex !== -1) {
                    preloadAdjacentImages(navigableImages, navIndex);
                }
            }, 200);
        };
        newImg.src = images[currentImageIndex].url;
    }

    // ========== work tree setup ==========
    function setupWorkTree() {
        const workTree = document.getElementById('work-tree');
        if (!workTree) return false;

        if (workTree.dataset.navSetup === 'true') return true;

        const workId = getWorkId();

        // Don't setup if we're not on a work page
        if (!workId) return false;

        workTree.id = 'work-tree-a';
        workTree.dataset.navSetup = 'true';

        if (workId !== currentWorkId) {
            allImages = null;
            currentWorkId = workId;
        }

        if (workTreeClickHandler) {
            workTree.removeEventListener('click', workTreeClickHandler, true);
        }

        workTreeClickHandler = async function(e) {
            const listItem = e.target.closest('.q-item');
            if (!listItem) return;

            const icon = listItem.querySelector('.q-icon.text-orange');
            if (icon?.textContent?.trim() === 'photo') {
                e.preventDefault();
                e.stopPropagation();

                const currentPageWorkId = getWorkId();

                if (!currentPageWorkId) {
                    console.error('could not determine work ID');
                    return;
                }

                // If work changed or allImages not loaded, fetch from API
                if (!allImages || currentPageWorkId !== currentWorkId) {
                    try {
                        console.log('fetching images from API (not cached or work changed)');
                        const fileTree = await callApi(`tracks/${currentPageWorkId}`);
                        allImages = extractAllImages(sortFileTree(fileTree));
                        currentWorkId = currentPageWorkId;
                        console.log('loaded', allImages.length, 'images');
                    } catch (err) {
                        console.error('failed to load images:', err);
                        return;
                    }
                }

                const filename = listItem.querySelector('.q-item__label').textContent.trim();

                const adjustedIndex = allImages.findIndex(img => img.filename === filename);

                if (adjustedIndex === -1) {
                    console.error('image not found in current scope');
                    return;
                }

                openImageViewer(allImages, adjustedIndex);
            }
        };

        workTree.addEventListener('click', workTreeClickHandler, true);

        return true;
    }

    function observeWorkTree() {
        const observer = new MutationObserver(() => {
            const workTree = document.getElementById('work-tree');
            // Only setup if work tree exists, not already set up, AND we're on a work page
            if (workTree && !workTree.dataset.navSetup && getWorkId()) {
                setupWorkTree();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Initial setup
        if (getWorkId()) {
            setupWorkTree();
        }
    }

    // ========== initialization ==========
    observeWorkTree();
})();
