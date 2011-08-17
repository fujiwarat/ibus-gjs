/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */
/*
 * Copyright 2011 Red Hat, Inc.
 * Copyright 2011 Peng Huang <shawn.p.huang@gmail.com>
 * Copyright 2011 Takao Fujiwara <tfujiwar@redhat.com>
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

const DBus = imports.gi.DBus;
const IBus = imports.gi.IBus;
const Lang = imports.lang;


function PanelBase(bus) {
    this._init(bus);
}

PanelBase.prototype = {

    _init: function(bus) {
        this._bus = bus;
        this._panel = IBus.PanelService.new(bus.get_connection());
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
        this._panel.connect('page-down-lookup-table',
                            Lang.bind(this, this.pageDownLookupTable));
        this._panel.connect('cursor-up-lookup-table',
                            Lang.bind(this, this.cursorUpLookupTable));
        this._panel.connect('cursor-down-lookup-table',
                            Lang.bind(this, this.cursorDownLookupTable));
        this._panel.connect('focus-in', Lang.bind(this, this.focusIn));
        this._panel.connect('focus-out', Lang.bind(this, this.focusOut));
        this._panel.connect('register-properties', Lang.bind(this, this.registerProperties));
        this._panel.connect('update-property', Lang.bind(this, this.updateProperty));
        this._panel.connect('state-changed', Lang.bind(this, this.stateChanged));
    },

    setCursorLocation: function(panel, x, y, w, h) {
    },

    updatePreeditText: function(panel, text, cursorPos, visible) {
    },

    showPreeditText: function(panel) {
    },

    hidePreeditText: function(panel) {
    },

    updateAuxiliaryText: function(panel, text, visible) {
    },

    showAuxiliaryText: function(panel) {
    },

    hideAuxiliaryText: function(panel) {
    },

    updateLookupTable: function(panel, lookupTable, visible) {
    },

    showLookupTable: function(panel) {
    },

    hideLookupTable: function(panel) {
    },

    pageUpLookupTable: function(panel) {
    },

    pageDownLookupTable: function(panel) {
    },

    cursorUpLookupTable: function(panel) {
    },

    cursorDownLookupTable: function(panel) {
    },

    showCandidateWindow: function(panel) {
    },

    hideCandidateWindow: function(panel) {
    },

    showLanguageBar: function() {
    },

    hideLanguageBar: function() {
    },

    focusIn: function(panel, path) {
    },

    focusOut: function(panel, path) {
    },

    registerProperties: function(panel, props) {
    },

    updateProperty: function(panel, prop) {
    },

    stateChanged: function(panel) {
    },

    reset: function() {
    },

    startSetup: function() {
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

    propertyActivate: function(propName, prop_state) {
        this._panel.property_activate(propName, prop_state);
    },

    propertyShow: function(propName) {
        propName = new DBus.String(propName);
        this._panel.property_show(propName);
    },

    propertyHide: function(prop_name) {
        propName = new DBus.String(propName);
        this._panel.property_hide(propName);
    },

    setBus: function(bus) {
        this._init(bus);
    },
};
