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

const St = imports.gi.St;
const Signals = imports.signals;
const PopupMenu = imports.ui.popupMenu;


function PopupImageMenuItemMarkup(text, iconName) {
    this._init(text, iconName);
}

/* We'd like to show the markup text likes bold type. */
PopupImageMenuItemMarkup.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,

    _init: function (text, iconName) {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this);

        this.label = new St.Label({ text: text });
        let clutter_text = this.label.get_clutter_text();
        clutter_text.set_markup(text);
        this.addActor(this.label);
        this._icon = new St.Icon({ style_class: 'popup-menu-icon' });
        this.addActor(this._icon, { align: St.Align.END });

        this.setIcon(iconName);
    },

    setIcon: function(name) {
        this._icon.icon_name = name;
    }
};
