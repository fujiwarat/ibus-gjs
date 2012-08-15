// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-
/*
 * Copyright 2012 Red Hat, Inc.
 * Copyright 2012 Peng Huang <shawn.p.huang@gmail.com>
 * Copyright 2012 Takao Fujiwara <tfujiwar@redhat.com>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, either version 2.1 of
 * the License, or (at your option) any later version.
 * 
 * This program is distributed in the hope it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for
 * more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gkbd = imports.gi.Gkbd;
const IBus = imports.gi.IBus;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Meta = imports.gi.Meta;
const Lang = imports.lang;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Util = imports.misc.util;
const Config = imports.misc.config;

const CandidatePanel = imports.ui.status.ibus.candidatePanel;
const PropertyManager = imports.ui.status.ibus.propertyManager;
const IPopupMenu = imports.ui.status.ibus.popupMenu;
const XKBLayout = imports.ui.status.ibus.xkbLayout;
const Switcher = imports.ui.status.ibus.switcher;
const Common = imports.ui.status.ibus.common;

const ICON_ENGINE = 'ibus-engine';
const SCHEMA_HOTKEY = 'org.freedesktop.ibus.general.hotkey';
const SECTION_HOTKEY = 'general/hotkey';
const KEY_TRIGGER = 'trigger-accel';
const KEY_TRIGGER_BACKWARD = 'trigger-accel-backward';
const KEY_TRIGGER_KO = 'trigger-ko';
const LAYOUTS_MAX_LENGTH = 4;
const ACCELERATOR_SWITCH_IME_FOREWARD = '<Control>space';

function Keybinding(accelerator, keysym, modifiers, reverse) {
    this._init(accelerator, keysym, modifiers, reverse);
}

Keybinding.prototype = {
    _init: function(accelerator, keysym, modifiers, reverse) {
        this.accelerator = accelerator;
        this.keysym = keysym;
        this.modifiers = modifiers;
        this.reverse = reverse;
    }
};

function IBusPanel(bus, indicator) {
    this._init(bus, indicator);
}

IBusPanel.prototype = {
    _init: function(bus, indicator) {
        this._indicator = indicator;
        this._propertyManager = null;
        this._activeEngine = null;
        this._duplicatedEngineList = [];
        this._engines = [];
        this._layouts = [];
        this._variants = [];
        this._gkbdlayout = null;
        this._fallbackLockID = -1;
        this._changedXkbOption = false;
        this._keybindings = [];
        this._switcher = null;
        this._enable_trigger_ko = false;

        if (!this._initBus(bus)) {
            return;
        }

        this._propertyManager = new PropertyManager.PropertyManager();
        this._propertyManager.connect('property-activate',
                                      Lang.bind(this, this._onPropertyManagerPropertyActivate));

        this._candidatePanel = new CandidatePanel.CandidatePanel();
        this._candidatePanel.connect('cursor-up',
                                     Lang.bind(this, function(widget) {
                                         this.cursorUp();}));
        this._candidatePanel.connect('cursor-down',
                                     Lang.bind(this, function(widget) {
                                         this.cursorDown();}));
        this._candidatePanel.connect('page-up',
                                     Lang.bind(this, function(widget) {
                                         this.pageUp();}));
        this._candidatePanel.connect('page-down',
                                     Lang.bind(this, function(widget) {
                                         this.pageDown();}));
        this._candidatePanel.connect('candidate-clicked',
                                     Lang.bind(this,
                                               function(widget, index, button, state) {
                                         this.candidateClicked(index, button, state);}));

        this.stateChanged();
        this._indicator.actor.connect('button-press-event',
                                      Lang.bind(this, this._onShellPanelButtonPressEvent));

        if (this._config != null) {
            this._configLoadLookupTableOrientation();
        }
    },

    _initBus: function(bus) {
        this._bus = bus;
        this._focusIC = null;

        this._config = null;
        if (this._bus.is_connected()) {
            this._config = this._bus.get_config();
            this._initSignals();

            if (this._config == null) {
                log('Could not get ibus-dconf.');
                return false;
            }

            this._config.connect('value-changed',
                                 Lang.bind(this, this._configValueChangedCB));
            //this._config.connect('reloaded', this._configReloadedCB);

            // connect bus signal
            this._bus.get_connection().signal_subscribe('org.freedesktop.DBus',
                                                        'org.freedesktop.DBus',
                                                        'NameOwnerChanged',
                                                        '/org/freedesktop/DBus',
                                                        IBus.SERVICE_PANEL,
                                                        Gio.DBusSignalFlags.NONE,
                                                        Lang.bind(this, this._nameOwnerChangedCB),
                                                        null,
                                                        null);
        }

        // init xkb
        this._initEnginesOrder();
        if (this._config != null) {
            this._updateEngines(this._config.get_value('general', 'preload_engines'),
                                this._config.get_value('general', 'engines_order'));
        } else {
            this._switchEngine(0, true);
        }

        global.stage.connect('captured-event',
                             Lang.bind(this, this._globalKeyPressHandler));

        global.display.add_keybinding(KEY_TRIGGER,
                                      new Gio.Settings({ schema: SCHEMA_HOTKEY }),
                                      Meta.KeyBindingFlags.NONE,
                                      Lang.bind(this, this._triggerKeyHandler),
                                      1,
                                      null);
        global.display.add_keybinding(KEY_TRIGGER_BACKWARD,
                                      new Gio.Settings({ schema: SCHEMA_HOTKEY }),
                                      Meta.KeyBindingFlags.NONE,
                                      Lang.bind(this, this._triggerKeyHandler),
                                      2,
                                      null);
        this._initTriggerKeys();
        return true;
    },

    _initSignals: function() {
        this._panel = new IBus.PanelService({ connection: this._bus.get_connection(),
                                              object_path: IBus.PATH_PANEL });
        this._panel.connect('set-cursor-location',
                            Lang.bind(this, this.setCursorLocation));
        this._panel.connect('update-preedit-text',
                            Lang.bind(this, this.updatePreeditText));
        this._panel.connect('show-preedit-text',
                            Lang.bind(this, this.showPreeditText));
        this._panel.connect('hide-preedit-text',
                            Lang.bind(this, this.hidePreeditText));
        this._panel.connect('update-auxiliary-text',
                            Lang.bind(this, this.updateAuxiliaryText));
        this._panel.connect('show-auxiliary-text',
                            Lang.bind(this, this.showAuxiliaryText));
        this._panel.connect('hide-auxiliary-text',
                            Lang.bind(this, this.hideAuxiliaryText));
        this._panel.connect('update-lookup-table',
                            Lang.bind(this, this.updateLookupTable));
        this._panel.connect('show-lookup-table',
                            Lang.bind(this, this.showLookupTable));
        this._panel.connect('hide-lookup-table',
                            Lang.bind(this, this.hideLookupTable));
        this._panel.connect('page-up-lookup-table',
                            Lang.bind(this, this.pageUpLookupTable));
        this._panel.connect('cursor-up-lookup-table',
                            Lang.bind(this, this.cursorUpLookupTable));
        this._panel.connect('cursor-down-lookup-table',
                            Lang.bind(this, this.cursorDownLookupTable));
        this._panel.connect('focus-in', Lang.bind(this, this.focusIn));
        this._panel.connect('focus-out', Lang.bind(this, this.focusOut));
        this._panel.connect('register-properties',
                            Lang.bind(this, this.registerProperties));
        this._panel.connect('update-property',
                            Lang.bind(this, this.updateProperty));
        this._panel.connect('state-changed',
                            Lang.bind(this, this.stateChanged));
    },

    _initEnginesOrder: function() {
        this._xkblayout = new XKBLayout.XKBLayout(this._config);
        this._initGkbd();

        let varEngines = (this._config != null) ?
            this._config.get_value('general', 'preload_engines') : null;
        let preloadEngines = (varEngines != null) ?
            varEngines.dup_strv() : [];

        let varPreloadEnginesInited = (this._config != null) ?
            this._config.get_value('general', 'preload_engines_inited') : null;
        let preloadEnginesInited = (varPreloadEnginesInited != null) ?
            varPreloadEnginesInited.get_boolean() : false;

        // Set preloadEnginesInited = true for back compatibility
        if (this._config != null &&
            preloadEngines.length != 0 && !preloadEnginesInited) {
                preloadEnginesInited = true;
                this._config.set_value('general',
                                       'preload_engines_inited',
                                       GLib.Variant.new_boolean(true));
        }

        this._updateXkbEngines();

        // Before update preloadEngineMode, updateXkbEngines() is called
        // because config_value_changed_cb() calls updateIMEngines().
        if (this._config != null && !preloadEnginesInited) {
            let variant = GLib.Variant.new_int32(
                    IBus.PreloadEngineMode.LANG_RELATIVE);
            this._config.set_value('general',
                                   'preload_engine_mode',
                                   variant);
        }

        this._updateIMEngines();

        if (this._config != null && !preloadEnginesInited) {
            this._config.set_value('general',
                                   'preload_engines_inited',
                                   GLib.Variant.new_boolean(true));
        }

        return true;
    },

    _accelerator_parse: function(accelerator) {
        let keysym = 0;
        let modifiers = 0;
        let accel = accelerator;
        let lindex = accel.indexOf('<');
        let rindex = accel.indexOf('>');

        while (lindex >= 0 && rindex > lindex + 1) {
            let name = accel.substring(lindex + 1, rindex).toLowerCase();
            if (name == 'release') {
                modifiers |= IBus.ModifierType.RELEASE_MASK;
            }
            else if (name == 'primary') {
                modifiers |= IBus.ModifierType.CONTROL_MASK;
            }
            else if (name == 'control') {
                modifiers |= IBus.ModifierType.CONTROL_MASK;
            }
            else if (name == 'shift') {
                modifiers |= IBus.ModifierType.SHIFT_MASK;
            }
            else if (name == 'shft') {
                modifiers |= IBus.ModifierType.SHIFT_MASK;
            }
            else if (name == 'ctrl') {
                modifiers |= IBus.ModifierType.CONTROL_MASK;
            }
            else if (name.substring(0, 3) == 'mod') {
                let mod_vals = [
                    IBus.ModifierType.MOD1_MASK,
                    IBus.ModifierType.MOD2_MASK,
                    IBus.ModifierType.MOD3_MASK,
                    IBus.ModifierType.MOD4_MASK,
                    IBus.ModifierType.MOD5_MASK];
                modifiers |= mod_vals[name[3] - '1'];
            }
            else if (name == 'ctl') {
                modifiers |= IBus.ModifierType.CONTROL_MASK;
            }
            else if (name == 'alt') {
                modifiers |= IBus.ModifierType.MOD1_MASK;
            }
            else if (name == 'meta') {
                modifiers |= IBus.ModifierType.META_MASK;
            }
            else if (name == 'hyper') {
                // meta_display_devirtualize_modifiers is not available
                modifiers |= IBus.ModifierType.MOD4_MASK;
            }
            else if (name == 'super') {
                // meta_display_devirtualize_modifiers is not available
                modifiers |= IBus.ModifierType.MOD4_MASK;
            }
            accel = accel.substring(rindex + 1, accel.length);

            if (accel == null || accel.length == 0) {
                break;
            }

            lindex = accel.indexOf('<');
            rindex = accel.indexOf('>');
        }

        if (accel != null && accel.length != 0) {
            keysym = IBus.keyval_from_name(accel);
        }

        return [keysym, modifiers];
    },

    _initTriggerKeys: function() {
        if (this._config == null) {
            return;
        }

        let varTrigger = this._config.get_value('general/hotkey',
                                                'trigger_accel');
        let triggers = varTrigger ? varTrigger.dup_strv() : [];

        for (let i = 0; i < triggers.length; i++) {
            let [keysym, modifiers] = this._accelerator_parse(triggers[i]);
            let keybinding = new Keybinding(triggers[i],
                                            keysym,
                                            modifiers,
                                            false);
            this._keybindings.push(keybinding);
        }

        let varTriggerBack = this._config.get_value('general/hotkey',
                                                    'trigger_accel_backward');
        let triggersBack = varTriggerBack ? varTriggerBack.dup_strv() : [];

        for (let i = 0; i < triggersBack.length; i++) {
            let [keysym, modifiers] = this._accelerator_parse(triggersBack[i]);
            let keybinding = new Keybinding(triggers[i],
                                            keysym,
                                            modifiers,
                                            true);
            this._keybindings.push(keybinding);
        }

        if (!(triggers.length == 1 &&
              triggers[0] == ACCELERATOR_SWITCH_IME_FOREWARD)) {
            return;
        }

        /* Either $LANG or get_language_names are not correct.
         * Currently there is no way to get LC_CTYPE.
         */
        let locale = GLib.getenv('LANG');
        if (locale == null) {
            let langs = GLib.get_language_names();
            locale = (langs.length > 0) ? langs[0] : 'C';
        }

        if (locale.substring(0, 2) == 'ko') {
            let ko_triggers = [
                'Hangul',
                'Alt'];

            for (let i = 0; i < ko_triggers.length; i++) {
                let [keysym, modifiers] = this._accelerator_parse(ko_triggers[i]);
                let keybinding = new Keybinding(ko_triggers[i],
                                                keysym,
                                                modifiers,
                                                false);
                this._keybindings.push(keybinding);
            }

            this._enable_trigger_ko = true;
            global.display.add_keybinding(KEY_TRIGGER_KO,
                                          new Gio.Settings({ schema: SCHEMA_HOTKEY }),
                                          Meta.KeyBindingFlags.NONE,
                                          Lang.bind(this, this._triggerKeyHandler),
                                          3,
                                          null);
        }

        /* FIXME: if locale.substring(0, 2) == 'ja', I'd like to use 
         * Zenkaku_Hankaku but Zenkaku_Hankaku and grave have the 
         * same keycode. So grave cannot be typed on US keyboard
         * if Zenkaku_Hankaku is enabled.
         */
    },

    _initGkbd: function() {
        this._gkbdlayout = Gkbd.Configuration.get();
        this._gkbdlayout.connect('changed', Lang.bind(this, this._syncGroup));
        GLib.test_timer_start();
        this._gkbdlayout.start_listen();
    },

    _setLangRelativePreloadEngines: function() {
        /* Either $LANG or get_language_names are not correct.
         * Currently there is no way to get LC_CTYPE.
         */
        let locale = GLib.getenv('LANG');
        if (locale == null) {
            let langs = GLib.get_language_names();
            locale = (langs.length > 0) ? langs[0] : 'C';
        }

        let lang = locale.split('.')[0];
        let engines = this._bus.list_engines();
        let imEngines = [];

        for (let i = 0; i < engines.length; i++) {
            let engine = engines[i];
            if (engine.language == lang &&
                engine.rank > 0) {
                imEngines.push(engine.name);
            }
        }

        lang = lang.split('_')[0];
        if (imEngines.length == 0) {
            for (let i = 0; i < engines.length; i++) {
                let engine = engines[i];
                if (engine.language == lang &&
                    engine.rank > 0) {
                    imEngines.push(engine.name);
                }
            }
        }

        if (imEngines.length == 0) {
            return false;
        }

        let varEngines = this._config.get_value('general', 'preload_engines');
        let preloadEngines = [];
        let origPreloadEngines = (varEngines != null) ?
            varEngines.dup_strv() : [];

        // clear input method engines
        for (let i = 0; i < origPreloadEngines.length; i++) {
            let name = origPreloadEngines[i];
            if (name.substring(0, 4) != 'xkb:') {
                continue;
            }
            preloadEngines.push(name);
        }

        for (let i = 0; i < imEngines.length; i++) {
            let name = imEngines[i];
            let j = 0;

            for (j = 0; j < preloadEngines.length; j++) {
                if (name == preloadEngines[j]) {
                    break;
                }
            }

            if (j < preloadEngines.length) {
                continue;
            }

            preloadEngines.push(name);
        }

        if (origPreloadEngines.join(',') != preloadEngines.join(',')) {
            this._config.set_value('general',
                                   'preload_engines',
                                   GLib.Variant.new_strv(preloadEngines));
        }

        return true;
    },

    _updateIMEngines: function() {
        if (this._config == null) {
            return;
        }

        let var_preload_engine_mode =
            this._config.get_value('general', 'preload_engine_mode');
        let preload_engine_mode = (var_preload_engine_mode != null) ?
            var_preload_engine_mode.get_int32() : IBus.PreloadEngineMode.USER;

        if (preload_engine_mode == IBus.PreloadEngineMode.USER) {
            return;
        }

        this._setLangRelativePreloadEngines();
    },

    _updateXkbEngines: function() {
        let varLayout = this._xkblayout.getLayout();
        let varVariant = this._xkblayout.getVariant();
        if (varLayout == '') {
            return;
        }

        this._layouts = varLayout.split(',');
        this._variants = varVariant.split(',');

        let registry = new IBus.XKBConfigRegistry();
        let varXkbEngineNames = [];
        let descriptions = this._gkbdlayout.get_short_group_names();
        let engines = [];

        for (let i = 0; i < this._layouts.length; i++) {
            let name = this._layouts[i];
            let langs = null;
            let lang = null;
            let variant = null;
            if (i < this._variants.length && this._variants[i] != '') {
                name += ':' + this._variants[i];
                variant = this._variants[i];
                let layout = name + '(' + this._variants[i] + ')';
                langs = registry.layout_lang_get_langs(layout);
                if (langs.length != 0) {
                    lang = langs[0];
                }
            } else {
                name += ':';
            }

            if (lang == null) {
                langs = registry.layout_lang_get_langs(this._layouts[i]);
                if (langs.lenth != 0) {
                    lang = langs[0];
                }
            }
            varXkbEngineNames.push('xkb:' + name + ':' + lang);
            if (this._config == null) {
                let name = 'xkb:' + name + ':' + lang;
                let description = null;
                if (i < descriptions.length && descriptions[i] != '') {
                    description = descriptions[i];
                }
                var engine = XKBLayout.engineDescNew(lang,
                                                     this._layouts[i],
                                                     null,
                                                     variant,
                                                     description,
                                                     name);
                engines.push(engine);
            }
        }

        if (this._config == null) {
            this._engines = this._checkEnginesHaveDuplicatedLang(engines);
            let i = this._gkbdlayout.get_current_group();
            let engine = this._engines[i];
            for (let j = i; j > 0; j--) {
                this._engines[j] = this._engines[j - 1];
            }
            this._engines[0] = engine;
            return;
        }

        let varEngines = this._config.get_value('general', 'preload_engines', null);
        let engineNames = (varEngines != null) ? varEngines.dup_strv() : [];
        let isUpdatedEngineNames = false;

        for (let i = 0; i < varXkbEngineNames.length; i++) {
            let name = varXkbEngineNames[i];
            let j = 0;

            for (j = 0; j < engineNames.length; j++) {
                if (name == engineNames[j]) {
                    break;
                }
            }
            if (j < engineNames.length) {
                continue;
            }

            isUpdatedEngineNames = true;
            engineNames.push(name);
        }

        if (isUpdatedEngineNames) {
            this._config.set_value('general', 'preload_engines',
                                   GLib.Variant.new_strv(engineNames));
        }

        let varOrder = this._config.get_value('general', 'engines_order');
        let orderNames = (varOrder != null) ? varOrder.dup_strv() : [];
        let isUpdatedOrderNames = false;

        for (let i = 0; i < varXkbEngineNames.length; i++) {
            let name = varXkbEngineNames[i];
            let j = 0;

            for (j = 0; j < orderNames.length; j++) {
                if (name == orderNames[j]) {
                    break;
                }
            }
            if (j < orderNames.length) {
                continue;
            }

            isUpdatedOrderNames = true;
            orderNames.push(name);
        }

        if (isUpdatedOrderNames) {
            this._config.set_value('general', 'engines_order',
                                   GLib.Variant.new_strv(orderNames));
        }
    },

    _updateEngines: function(varEngines, varOrder) {
        let engineNames = (varOrder != null) ? varEngines.dup_strv() : [];

        if (engineNames == null || engineNames.length == 0) {
            engineNames = ['xkb:us::eng'];
        }

        let orderNames = (varOrder != null) ? varOrder.dup_strv() : [];
        let names = [];

        for (let i = 0; i < orderNames.length; i++) {
            let name = orderNames[i];
            for (let j = 0; j < engineNames.length; j++) {
                if (name == engineNames[j]) {
                    names.push(name);
                    break;
                }
            }
        }

        for (let i = 0; i < engineNames.length; i++) {
            let name = engineNames[i];
            let j = 0;

            for (j = 0; j < names.length; j++) {
                if (name == names[j]) {
                    break;
                }
            }
            if (j < names.length) {
                continue;
            }

            names.push(name);
        }

        let engines = this._bus.get_engines_by_names(names);

        if (this._engines.length == 0) {
            this._engines = this._checkEnginesHaveDuplicatedLang(engines);
            this._switchEngine(0, true);
        } else {
            let currentEngine = this._engines[0];
            this._engines = this._checkEnginesHaveDuplicatedLang(engines);
            for (let i = 0; i < engines.length; i++) {
                if (currentEngine.get_name() == engines[i].get_name()) {
                    this._switchEngine(i);
                    return;
                }
            }
            this._switchEngine(0, true);
        }
    },

    _syncGroup: function() {
        /* The callback is called four times after setLayout is called
         * so check the elapsed and take the first signal only. */
        let elapsed = GLib.test_timer_elapsed();
        if (elapsed < 1.0 && elapsed > 0.0) {
            return;
        }

        if (this._fallbackLockID != -1) {
            /* Call lock_group only when setLayout is called. */
            this._gkbdlayout.lock_group(this._fallbackLockID);
            this._fallbackLockID = -1;
        } else {
            /* Reset default layout when gnome-control-center is called. */
            this._xkblayout.resetLayout();
        }

        this._updateXkbEngines();
        GLib.test_timer_start();
    },

    _switchEngine: function(i, force) {
        if (force == undefined) {
            force = false;
        }
        if (i < 0 || i >= this._engines.length) {
            assert();
        }

        // Do not need switch
        if (i == 0 && !force) {
            return;
        }

        // Move the target engine to the first place.
        let engine = this._engines[i];
        for (let j = i; j > 0; j--) {
            this._engines[j] = this._engines[j - 1];
        }
        this._engines[0] = engine;

        if (this._bus.is_connected() &&
            !this._bus.set_global_engine(engine.get_name())) {
            global.log('Switch engine to ' + engine.get_name() + ' failed.');
            return;
        }
        this._setIMIcon(engine.icon, this.getIconTextFromEngine(engine));

        // set xkb layout
        this._setLayout(engine.get_layout());

        if (this._config != null) {
            let names = [];
            for (let j = 0; j < this._engines.length; j++) {
                names.push(this._engines[j].get_name());
            }
            this._config.set_value('general', 'engines_order',
                                   GLib.Variant.new_strv(names));
        }
    },

    _setLayout: function(layout) {
        if (layout == 'default' || layout == null) {
            return;
        }

        if (this._xkblayout == null) {
            this._initEnginesOrder();
            this._initTriggerKeys();
        }

        if (this._setGkbdLayout(layout)) {
            return;
        }

        this._setXkbGroupLayout(layout);
        return;
    },

    _setGkbdLayout: function(layout) {
        /* If a previous ibus engine changed XKB options, need to set the
         * default XKB option. */
        if (this._changedXkbOption) {
            this._changedXkbOption = false;
            return false;
        }

        let gkbdLen = this._gkbdlayout.get_group_names().length;
        for (let i = 0; i < this._layouts.length && i < gkbdLen; i++) {
            let sysLayout = this._layouts[i];
            if (i < this._variants.length && this._variants[i] != '') {
                sysLayout = sysLayout + '(' + this._variants[i] + ')';
            }
            if (sysLayout == layout) {
                this._gkbdlayout.lock_group(i);
                return true;
            }
        }
        return false;
    },

    _setXkbGroupLayout: function(layout) {
        let retval = this._xkblayout.setLayout(layout);
        if (retval[0] >= 0) {
            /* If an XKB keymap is added into the XKB group, 
             * this._gkbdlayout.lock_group will be called after
             * 'group-changed' signal is received. */
            this._fallbackLockID = retval[0];
            this._changedXkbOption = retval[1];
        }
    },

    /**
     * _globalKeyPressHandler:
     *
     * This is used for shell entry boxes likes shell search or run dialog.
     */
    _globalKeyPressHandler: function(actor, event) {
        if (event.type() != Clutter.EventType.KEY_PRESS &&
            event.type() != Clutter.EventType.KEY_RELEASE) {
            return false;
        }

        let keysym = event.get_key_symbol();
        let ignoredModifiers = global.display.get_ignored_modifier_mask();
        let modifierState = event.get_state()
            & IBus.ModifierType.MODIFIER_MASK
            & ~ignoredModifiers;
        let backwards = modifierState & IBus.ModifierType.SHIFT_MASK;
        modifierState &= ~IBus.ModifierType.SHIFT_MASK;
        let isTrigger = false;

        if (modifierState &
            (IBus.ModifierType.HANDLED_MASK | IBus.ModifierType.FORWARD_MASK)) {
            return false;
        }

        // If Switcher dialog is running.
        if (this._switcher != null) {
            /* This filter is also called when Switcher dialog is running
             * with gtk clients but this is needed for shell clients only.
             */
            if (!Main.overview.visible) {
                return false;
            }

            if (event.type() == Clutter.EventType.KEY_PRESS) {
                isTrigger = this._switcher.keyPressEvent(event);
                if (!isTrigger) {
                    // Do not handle KEY_RELEASE event.
                    this._switcher = null;
                }
                return isTrigger;
            }
            else if (event.type() == Clutter.EventType.KEY_RELEASE) {
                return this._switcher.keyReleaseEvent(event);
            }
        }

        if (event.type() != Clutter.EventType.KEY_PRESS) {
            return false;
        }

        /* FIXME: this._triggerKeyHandler returns the key events
         * even if the keycode is matched but the keysym is not matched.
         * E.g. grave on us keyboard and Zenkaku_Hankaku on jp keyboard
         * are same keycodes but different keysyms.
         * Do we need to check keycodes instead of keysyms here?
         * Probably I think if users register Zenkaku_Hankaku as trigger,
         * they do not like to treat grave as trigger.
         * So maybe I wish to fix this._triggerKeyHandler instead of
         * this._globalKeyPressHandler .
         */
        for (let i = 0; i < this._keybindings.length; i++) {
            if (this._keybindings[i].keysym == keysym &&
                this._keybindings[i].modifiers == modifierState) {
                this._handleEngineSwitch(modifierState | backwards,
                                         modifierState | backwards);
                isTrigger = true;
                break;
            }
        }
        return isTrigger;
    },

    /**
     * _triggerKeyHandler:
     *
     * This is used for non-shell clients likes gtk clients.
     */
    _triggerKeyHandler: function(display, screen, window, binding, data) {
        let name = binding.get_name();
        if (name.substring(0, 7) != 'trigger') {
            global.log('Wrong name is binded ' + name);
            return;
        }
        let modifiers = binding.get_modifiers();
        this._handleEngineSwitch(modifiers, binding.get_mask());
    },

    _handleEngineSwitch: function(modifiers, mask) {
        let switcher = new Switcher.Switcher(this, this._keybindings);
        this._switcher = switcher;
        /* FIXME: Need to get the keysym.
         * MetaKeyHandlerFunc does not provide keysym but we have
         * the same keycode with different keysyms switching XKB layouts.
         * E.g. grave on US keyboard and Zenkaku_Hankaku on JP keyboard 
         * have the same keycode. */

        switcher.connect('engine-activated',
                         Lang.bind (this, function (object, name) {
            this._switcher = null;
            if (this._engines == null) {
                global.log('Engine list is null.');
                return;
            }
            for (let i = 0; i < this._engines.length; i++) {
                if (name == this._engines[i].get_name()) {
                    this._switchEngine(i, true);
                    break;
                }
            }}));

        if (!switcher.show(this._engines, mask)) {
            switcher.destroy();
            this._switcher = null;
        }
    },

    _configValueChangedCB: function(bus, section, name, variant) {
        global.log ('config changed:' + section + '-' + name + ':' + variant);
        if (section == 'general' && name == 'preload_engine_mode') {
            this._updateIMEngines();
            return;
        }

        if (section == 'general' && name == 'preload_engines') {
            this._updateEngines(variant, null);
            return;
        }

        if (section == 'general/hotkey' &&
            name.length >= 13 && name.substring(0, 13) == 'trigger_accel') {
            global.display.remove_keybinding(KEY_TRIGGER);
            global.display.remove_keybinding(KEY_TRIGGER_BACKWARD);

            if (this._enable_trigger_ko) {
                global.display.remove_keybinding(KEY_TRIGGER_KO);
                this._enable_trigger_ko = false;
            }

            this._keybindings = [];

            global.display.add_keybinding(KEY_TRIGGER,
                                          new Gio.Settings({ schema: SCHEMA_HOTKEY }),
                                          Meta.KeyBindingFlags.NONE,
                                          Lang.bind(this, this._triggerKeyHandler),
                                          1,
                                          null);
            global.display.add_keybinding(KEY_TRIGGER_BACKWARD,
                                          new Gio.Settings({ schema: SCHEMA_HOTKEY }),
                                          Meta.KeyBindingFlags.NONE,
                                          Lang.bind(this, this._triggerKeyHandler),
                                          2,
                                          null);
            this._initTriggerKeys();
            return;
        }

        if (section == 'panel' && name == 'lookup_table_orientation') {
            this._configLoadLookupTableOrientation();
            return;
        }
    },

    _configLoadLookupTableOrientation: function() {
        let value = this._config.get_value('panel', 'lookup_table_orientation',
                                           GLib.Variant.new_int32(0)).get_int32();
        let orientation = Common.ORIENTATION_VERTICAL;
        if (value in [Common.ORIENTATION_HORIZONTAL,
                      Common.ORIENTATION_VERTICAL])
            orientation = value;
        if (this._candidatePanel)
            this._candidatePanel.setOrientation(orientation);
    },

    _configReloadedCB: function(bus) {
    },

    _nameOwnerChangedCB: function(bus, name, oldname, newname) {
        this._configReloadedCB(this._bus);
    },

    _createShellMenuForIM: function() {
        if (this._createIMMenuShell()) {
            this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this._propertyManager.createMenuItems(this._indicator.menu);
        } else {
            let item = new PopupMenu.PopupImageMenuItem(_("No input window"),
                                                        'dialog-information');
            this._indicator.menu.addMenuItem(item);
            this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        }
    },

    _createShellMenuForPopup: function() {
        this._indicator.menu.addSettingsAction(_("Region and Language Settings"),
                                               'gnome-region-panel.desktop');
        this._indicator.menu.addAction(_("Show Keyboard Layout"),
                                       Lang.bind(this, function() {
            Main.overview.hide();
            let xkbGroupID = this._gkbdlayout.get_current_group();
            if (xkbGroupID < 0) {
                xkbGroupID = 0;
            }
            Util.spawn(['gkbd-keyboard-display', '-g', String(xkbGroupID + 1)]);
        }));
    },

    _onPropertyManagerPropertyActivate: function(widget, prop_name, prop_state) {
        this.propertyActivate(prop_name, prop_state);
    },

    _onShellPanelButtonPressEvent: function(actor, event) {
        this._indicator.menu.removeAll();
        this._createShellMenuForIM();
        this._createShellMenuForPopup();
    },

    _getDuplicatedEngineId: function(engine) {
        if (engine == null) {
            return null;
        }
        for (let i = 0; i < this._duplicatedEngineList.length; i+=2) {
            if (engine.name == this._duplicatedEngineList[i]) {
                return this._duplicatedEngineList[i + 1];
            }
        }
        return null;
    },

    _checkEnginesHaveDuplicatedLang: function(engines) {
        this._duplicatedEngineList = [];
        for (let i = 0; i < engines.length; i++) {
            engines[i].hasDuplicatedLang = false;
        }

        for (let i = 0; i < engines.length - 1; i++) {
            let engine_i = engines[i];
            let cnt = 0;
            if (engine_i == null) {
                continue;
            }
            if (this._getDuplicatedEngineId(engine_i) != null) {
                continue;
            }

            let lang_i = engine_i.language;
            if (engine_i.symbol != undefined && engine_i.symbol != '') {
                lang_i = engine_i.symbol;
            }
            for (let j = i + 1; j < engines.length; j++) {
                let engine_j = engines[j];
                if (engine_j == null) {
                    continue;
                }
                let lang_j = engine_j.language;
                if (engine_j.symbol != undefined && engine_j.symbol != '') {
                    lang_j = engine_j.symbol;
                }
                if (lang_i == lang_j) {
                    engine_i.hasDuplicatedLang = true;
                    engine_j.hasDuplicatedLang = true;
                    this._duplicatedEngineList.push(engine_j.name);
                    cnt++;
                    // U+2081 SUBSCRIPT ONE
                    this._duplicatedEngineList.push(String.fromCharCode(0x2081 + cnt));
                }
            }
        }

        return engines;
    },

    _addEngineInMenu: function(engine, n) {
        let fullLang = engine.language;
        let lang = IBus.get_language_name(fullLang);
        if (lang == null) {
            fullLang = '+@';
            lang = _("Other");
        }
        let shortName = fullLang.substring(0,2);
        if (engine.symbol != undefined && engine.symbol != '') {
            shortName = engine.symbol;
        }
        let suffix = this._getDuplicatedEngineId(engine);
        if (suffix != null) {
            shortName += suffix;
        }
        let shortLabel = new St.Label({ text: shortName });
        let text = lang;
        if (engine.hasDuplicatedLang) {
                text = text + ' (' + engine.longname + ')';
        }
        shortLabel._icon_name = ICON_ENGINE;
        if (engine.icon != null) {
            shortLabel._icon_name = engine.icon;
        }
        let item = new IPopupMenu.PopupActorMenuItem(text, shortLabel);
        if (n == 0) {
            item.setShowDot(true);
        } else {
            item.setShowDot(false);
        }
        item._engine = engine;
        item.connect('activate',
                     Lang.bind(this, this._imMenuItemShellActivateCB));
        this._indicator.menu.addMenuItem(item);
    },

    _createIMMenuShell: function() {
        for (let i = 0; i < this._engines.length; i++) {
            let engine = this._engines[i];
            engine.isBridge = false;
            this._addEngineInMenu(engine, i);
        }
        return true;
    },

    _imMenuItemStatusActivateCB: function(item) {
        for (let i = 0; i < this._engines.length; i++) {
            if (item._engine.get_name() == this._engines[i].get_name()) {
                this._switchEngine(i, true);
                return;
            }
        }
    },

    _imMenuItemShellActivateCB: function(item, event) {
        this._imMenuItemStatusActivateCB(item);
    },

    _setIMIcon: function(iconName, label) {
        if (this._indicator == null) {
            return;
        }
        if (iconName == null) {
            iconName = ICON_ENGINE;
        }
        if (iconName[0] == '/') {
            let paths = null;
            let n_elements = 0;
            iconName = GLib.path_get_basename(iconName);
            if (iconName.indexOf('.') >= 0) {
                iconName = iconName.substr(0, iconName.lastIndexOf('.'));
            }
        }
        if (label != null) {
            this._indicator.setLabel(label);
        } else {
            this._indicator.setIcon(iconName);
        }
    },

    _updateIconWithProperty: function(prop) {
        if (prop.get_key() != 'InputMode') {
            return;
        }
        let text = prop.get_label().get_text();
        if (text == null || text == '') {
            return;
        }
        this._setIMIcon(null, text);
    },

    _getVariantFromLayout: function(layout) {
        let leftBracket = layout.indexOf('(');
        let rightBracket = layout.indexOf(')');
        if (leftBracket >= 0 && rightBracket > leftBracket) {
            return [layout.substring(0, leftBracket) + layout.substring(rightBracket + 1, layout.length),
                    layout.substring(leftBracket + 1, rightBracket)];
        }
        return [layout, 'default'];
    },

    _getOptionFromLayout: function(layout) {
        let leftBracket = layout.indexOf('[');
        let rightBracket = layout.indexOf(']');
        if (leftBracket >= 0 && rightBracket > leftBracket) {
            return [layout.substring(0, leftBracket) + layout.substring(rightBracket + 1, layout.length),
                    layout.substring(leftBracket + 1, rightBracket)];
        }
        return [layout, 'default'];
    },

    _mergeVariantsAndOptions: function(curLayout, engineLayout) {
        let origLayout = curLayout;
        let engineVariant = 'default';
        let engineOption = 'default';
        [engineLayout, engineVariant] =
            this._getVariantFromLayout(engineLayout);
        [engineLayout, engineOption] =
            this._getOptionFromLayout(engineLayout);
        if ((engineVariant == null || engineVariant == 'default') &&
            (engineOption == null || engineOption == 'default')) {
            return curLayout;
        }
        let curVariant = 'default';
        let curOption = 'default';
        [curLayout, curVariant] =
            this._getVariantFromLayout(curLayout);
        [curLayout, curOption] =
            this._getOptionFromLayout(curLayout);
        // Currently implemented options only.
        // Merging layouts and variants are a little complicated.
        // e.g. ja,ru + ja(kana) == ja,ru,ja(,,kana)
        if (engineOption != null && engineOption != 'default') {
            if (curOption == null || curOption == 'default') {
                curOption = engineOption;
            }
            else if (curOption != null && curOption != 'default') {
                curOption = curOption + ',' + engineOption;
            }
            if (curVariant != null && curVariant != 'default') {
                curLayout = curLayout + '(' + curVariant + ')';
            }
            if (curOption != null && curOption != 'default') {
                curLayout = curLayout + '[' + curOption + ']';
            }
            return curLayout
        }
        return origLayout
    },

    _engineGetLayoutWrapper: function(engine, changedState) {
        const xkbPrefix = 'xkb:';
        if (engine.name != null &&
            engine.name.substring(0, xkbPrefix.length) == xkbPrefix) {
            return engine.layout;
        } else if (engine.layout != 'default') {
            /* engine is an input-method or a keymap and if engine is
             * a keymap, the layout is not 'default'.
             * if engine is an input-method, the layout is merged with the
             * current XKB keymap here.
             */
            if (engine.layout != null && 
                engine.layout.substring(0, 'default'.length) == 'default') {
                return this._mergeVariantsAndOptions(retval, engine.layout);
            }
        }
        return engine.layout;
    },

    getIconTextFromEngine: function(engine) {
         let imIcon = engine.language.substring(0,2);
         if (engine.language == 'other') {
             imIcon = '+@';
         }
         if (engine.symbol != undefined && engine.symbol != '') {
             imIcon = engine.symbol;
         }
         let suffix = this._getDuplicatedEngineId(engine);
         if (suffix != null) {
             imIcon += suffix;
         }
         return imIcon;
    },

    setCursorLocation: function(panel, x, y, w, h) {
        this._candidatePanel.setCursorLocation(x, y, w, h);
    },

    updatePreeditText: function(panel, text, cursorPos, visible) {
        this._candidatePanel.updatePreeditText(text, cursorPos, visible);
    },

    showPreeditText: function(panel) {
        this._candidatePanel.showPreeditText();
    },

    hidePreeditText: function(panel) {
        this._candidatePanel.hidePreeditText();
    },

    updateAuxiliaryText: function(panel, text, visible) {
        this._candidatePanel.updateAuxiliaryText(text, visible);
    },

    showAuxiliaryText: function(panel) {
        this._candidatePanel.showAuxiliaryText();
    },

    hideAuxiliaryText: function(panel) {
        this._candidatePanel.hideAuxiliaryText();
    },

    updateLookupTable: function(panel, lookupTable, visible) {
        this._candidatePanel.updateLookupTable(lookupTable, visible);
    },

    showLookupTable: function(panel) {
        this._candidatePanel.showLookupTable();
    },

    hideLookupTable: function(panel) {
        this._candidatePanel.hideLookupTable();
    },

    pageUpLookupTable: function(panel) {
        this._candidatePanel.pageUpLookupTable();
    },

    pageDownLookupTable: function(panel) {
        this._candidatePanel.pageDownLookupTable();
    },

    cursorUpLookupTable: function(panel) {
        this._candidatePanel.cursorUpLookupTable();
    },

    cursorDownLookupTable: function(panel) {
        this._candidatePanel.cursorDownLookupTable();
    },

    showCandidateWindow: function(panel) {
        this._candidatePanel.showAll();
    },

    hideCandidateWindow: function(panel) {
        this._candidatePanel.hideAll();
    },

    registerProperties: function(panel, props) {
        for (let i = 0; props.get(i) != null; i++) {
            this._updateIconWithProperty(props.get(i));
        }
        this._propertyManager.registerProperties(props);
    },

    updateProperty: function(panel, prop) {
        this._updateIconWithProperty(prop);
        this._propertyManager.updateProperty(prop);
    },

    focusIn: function(panel, path) {
    },

    focusOut: function(panel, path) {
        this.reset();
        this._focusIC = null;
    },

    stateChanged: function(panel) {
        let engine = null;
        if (this._bus.is_connected()) {
            engine = this._bus.get_global_engine();
        } else if (this._engines.length > 0) {
            engine = this._engines[this._gkbdlayout.get_current_group()];
        } else {
            return;
        }
        this._setIMIcon(engine.icon, this.getIconTextFromEngine(engine));
    },

    reset: function(ic) {
        this._candidatePanel.reset();
    },

    pageUp: function() {
        this._panel.page_up();
    },

    pageDown: function() {
        this._panel.page_down();
    },

    cursorUp: function() {
        this._panel.cursor_up();
    },

    cursorDown: function() {
        this._panel.cursor_down();
    },

    candidateClicked: function(index, button, state) {
        this._panel.candidate_clicked(index, button, state);
    },

    propertyActivate: function(propName, propState) {
        this._panel.property_activate(propName, propState);
    },

    propertyShow: function(propName) {
        propName = new DBus.String(propName);
        this._panel.property_show(propName);
    },

    propertyHide: function(prop_name) {
        propName = new DBus.String(propName);
        this._panel.property_hide(propName);
    },

    restart: function(bus) {
        this._initBus(bus);
    }
};
