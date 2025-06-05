import * as Constants from './constants.js';
import { sharedState } from './state.js';

function resetOriginalContainers() {
    const containers = document.querySelectorAll(
        '#qr--bar > .qr--buttons:not(#input_helper_toolbar):not(#custom_buttons_container)'
    );
    containers.forEach(c => c.classList.remove('qrq-whitelisted-original'));
}

function filterMenuItems() {
    const { chatItemsContainer, globalItemsContainer } = sharedState.domElements;
    const buttons = [
        ...(chatItemsContainer ? Array.from(chatItemsContainer.querySelectorAll(`.${Constants.CLASS_ITEM}`)) : []),
        ...(globalItemsContainer ? Array.from(globalItemsContainer.querySelectorAll(`.${Constants.CLASS_ITEM}`)) : [])
    ];
    const whitelist = window.extension_settings[Constants.EXTENSION_NAME]?.whitelist || [];
    buttons.forEach(btn => {
        const isStandard = btn.dataset.isStandard === 'true';
        const setName = btn.dataset.setName;
        const scriptId = btn.dataset.scriptId;
        let id = '';
        if (isStandard) {
            id = `QRV2::${setName}`;
        } else if (scriptId) {
            id = `JSR::${scriptId}`;
        }
        if (id && whitelist.includes(id)) {
            btn.remove();
        }
    });
}

function restoreOriginalContainers() {
    const whitelist = window.extension_settings[Constants.EXTENSION_NAME]?.whitelist || [];
    whitelist.forEach(wid => {
        if (wid.startsWith('QRV2::')) {
            const setName = wid.substring(6);
            if (window.quickReplyApi?.getSetByName) {
                const set = window.quickReplyApi.getSetByName(setName);
                if (set?.dom) {
                    set.dom.classList.add('qrq-whitelisted-original');
                }
            }
        } else if (wid.startsWith('JSR::')) {
            const scriptId = wid.substring(5);
            let container = document.getElementById(`script_container_${scriptId}`);
            if (!container) {
                const allContainers = document.querySelectorAll('#qr--bar .qr--buttons');
                allContainers.forEach(c => {
                    if (!container && c.querySelector(`button[data-script-id="${scriptId}"]`)) {
                        container = c;
                    }
                });
            }
            if (container) {
                container.classList.add('qrq-whitelisted-original');
            } else {
                console.warn(`QRQ whitelist: container for script_id ${scriptId} not found`);
            }
        }
    });
}

export function applyWhitelistDOMChanges() {
    resetOriginalContainers();
    filterMenuItems();
    restoreOriginalContainers();
}

export function observeBarMutations() {
    const bar = document.querySelector('#qr--bar');
    if (!bar) return;
    const observer = new MutationObserver(muts => {
        muts.forEach(m => {
            m.addedNodes.forEach(node => {
                if (!(node instanceof HTMLElement)) return;
                if (node.matches('.qr--buttons:not(#input_helper_toolbar):not(#custom_buttons_container)')) {
                    const isStandard = node.dataset.isStandard === 'true';
                    let id = '';
                    if (isStandard) {
                        const setName = node.dataset.setName;
                        id = `QRV2::${setName}`;
                    } else {
                        const scriptId = node.dataset.scriptId;
                        if (scriptId) id = `JSR::${scriptId}`;
                    }
                    if (id && window.extension_settings[Constants.EXTENSION_NAME]?.whitelist?.includes(id)) {
                        node.classList.add('qrq-whitelisted-original');
                    }
                }
            });
        });
    });
    observer.observe(bar, { childList: true });
}

window.quickReplyMenu = window.quickReplyMenu || {};
window.quickReplyMenu.applyWhitelistDOMChanges = applyWhitelistDOMChanges;
window.quickReplyMenu.observeBarMutations = observeBarMutations;
