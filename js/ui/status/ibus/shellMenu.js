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

const IBus = imports.gi.IBus;
const St = imports.gi.St;
const Lang = imports.lang;
const Signals = imports.signals;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;

const PropItem = imports.ui.status.ibus.propItem;
const Common = imports.ui.status.ibus.common;

function ShellMenu(prop) {
    this._init(prop);
}

/**
 * ShellMenu:
 * @prop: IBus.Property
 *
 * This class can be used to display the sub menu in the active menu
 * on the shell status icon as panelMenu.SystemStatusLabelButton.menu
 * and also creates ths sub menu items in the menu.
 * This class also forwards the signal of 'property-activate' from
 * the sub menu items.
 */
ShellMenu.prototype = {
    __proto__ : PropItem.PropItem.prototype,

    _init: function(prop) {
        PropItem.PropItem.prototype._init.call(this, prop);

        this.item = new PopupMenu.PopupSubMenuMenuItem(prop.get_label().get_text());
        this._createItems(this._prop.get_sub_props());
        Common.actorSetSensitive(this.item.actor,
                                 this._prop.get_sensitive(),
                                 this.item.label);
    },

    _createItems: function(props) {
        let radioGroup = [];
        let item = null;

        for (let i = 0; props.get(i) != null; i++) {
            let prop = props.get(i);
            if (prop.get_prop_type() == IBus.PropType.NORMAL) {
                item = new ImageShellMenuItem(prop);
            } else if (prop.get_prop_type() == IBus.PropType.TOGGLE) {
                item = new CheckShellMenuItem(prop);
            } else if (prop.get_prop_type() == IBus.PropType.RADIO) {
                item = new RadioShellMenuItem(radioGroup, prop);
                radioGroup.push(item);
                for (let j = 0; j < radioGroup.length; j++) {
                    radioGroup[j].setGroup(radioGroup);
                }
            } else if (prop.get_prop_type() == IBus.PropType.SEPARATOR) {
                item = new SeparatorShellMenuItem();
                radioGroup = [];
            } else if (prop.get_prop_type() == IBus.PropType.MENU) {
                item = new ShellMenu(prop);
            } else {
                assert (false);
            }

            if (prop.get_tooltip()) {
                item.setTooltipText(prop.get_tooltip().get_text());
            }
            item.setSensitive(prop.get_sensitive());
            if (prop.get_visible()) {
                item.show();
            } else {
                item.hide();
            }

            this.item.menu.addMenuItem(item.item);
            this._subItems.push(item);

            if (prop.get_prop_type() != IBus.PropType.NORMAL &&
                prop.get_prop_type() != IBus.PropType.TOGGLE &&
                prop.get_prop_type() != IBus.PropType.RADIO) {
                continue;
            }
            item.connect('property-activate',
                         Lang.bind(this, this._onItemPropertyActivate));
        }
    },

    _propertyClicked: function(item, prop) {
    },

    _onItemPropertyActivate: function (w, n, s) {
        this.emit('property-activate', n, s);
    },

    addMenuItem: function(menuItem) {
        this.item.addMenuItem(menuItem);
    },

    show: function() {
        this.item.actor.show();
    },

    destroy: function() {
        this.item.destroy();
    },

    setSensitive: function(sensitive) {
        Common.actorSetSensitive(this.item.actor,
                                 sensitive,
                                 this.item.label);
    }
};

Signals.addSignalMethods(ShellMenu.prototype);

function ImageShellMenuItem(prop) {
    this._init(prop);
}

/**
 * ImageShellMenuItem:
 * @prop: IBus.Property
 *
 * This class creates popupMenu.PopupImageMenuItem from @prop and
 * also emits the signal of 'property-activate' when it's activated.
 */
ImageShellMenuItem.prototype = {
    __proto__ : PropItem.PropItem.prototype,

    _init: function(prop) {
        PropItem.PropItem.prototype._init.call(this, prop);
        this.item = new PopupMenu.PopupImageMenuItem(this._prop.get_label().get_text(),
                                                     this._prop.get_icon());
        this._activateId = this.item.connect('activate',
                                             Lang.bind(this, this._onActivate));

        if (this._prop.get_visible()) {
            this.item.actor.show();
        } else {
            this.item.actor.hide();
        }
    },

    _onActivate: function() {
        this.emit('property-activate', this._prop.get_key(), this._prop.get_state());
    },

    propertyChanged: function() {
        Common.actorSetSensitive(this.item.actor,
                                 this._prop.get_sensitive(),
                                 this.item.label);
        if (this._prop.get_visible()) {
            this.item.actor.show();
        } else {
            this.item.actor.hide();
        }
    },

    show: function() {
        this.item.actor.show();
    },

    hide: function() {
        this.item.actor.hide();
    },

    destroy: function() {
        this.disconnect(this._activateId);
        this.item.destroy();
    },

    setSensitive: function(sensitive) {
        Common.actorSetSensitive(this.item.actor,
                                 sensitive,
                                 this.item.label);
    },

    setTooltipText: function(text) {
        this.item.actor.set_tooltip_text(text);
    },

    setSubmenu: function(submenu) {
        this.item.addActor(submenu.actor, null, null);
    },

    setLabel: function(label) {
        this.item.label.set_text(label);
    }
};

Signals.addSignalMethods(ImageShellMenuItem.prototype);

function CheckShellMenuItem(prop) {
    this._init(prop);
}

/**
 * CheckShellMenuItem:
 * @prop: IBus.Property
 *
 * This class creates popupMenu.PopupSwitchMenuItem from @prop and
 * also emits the signal of 'property-activate' when it's activated.
 */
CheckShellMenuItem.prototype = {
    __proto__ : PropItem.PropItem.prototype,

    _init: function(prop) {
        PropItem.PropItem.prototype._init.call(this, prop);
        this.item = new PopupMenu.PopupSwitchMenuItem(this._prop.get_label().get_text(),
                                                      this._prop.get_state() == IBus.PropState.CHECKED);

        this._activateId = this.item.connect('activate',
                                             Lang.bind(this, this._onActivate));

        if (this._prop.get_visible()) {
            this.item.actor.show();
        } else {
            this.item.actor.hide();
        }
    },

    _onActivate: function() {
        // Do not send property-activate to engine in case the event is
        // sent from engine.
        let do_emit = false;
        if (this.item.state) {
            if (this._prop.get_state() != IBus.PropState.CHECKED) {
                do_emit = true;
            }
            this._prop.set_state(IBus.PropState.CHECKED);
        } else {
            if (this._prop.get_state() != IBus.PropState.UNCHECKED) {
                do_emit = true;
            }
            this._prop.set_state(IBus.PropState.UNCHECKED);
        }
        if (do_emit) {
            this.emit('property-activate', this._prop.get_key(), this._prop.get_state());
        }
    },

    propertyChanged: function() {
        this.item.setToggleState(this._prop.get_state() == IBus.PropState.CHECKED);
        this.setSensitive(this._prop.get_sensitive());
        if (this._prop.get_visible()) {
            this.item.actor.show();
        } else {
            this.item.actor.hide();
        }
    },

    show: function() {
        this.item.actor.show();
    },

    hide: function() {
        this.item.actor.hide();
    },

    destroy: function() {
        this.disconnect(this._activateId);
        this.item.destroy();
    },

    setSensitive: function(sensitive) {
        Common.actorSetSensitive(this.item.actor,
                                 sensitive,
                                 this.item.label);
    },

    setTooltipText: function(text) {
        this.item.actor.set_tooltip_text(text);
    },

    setSubmenu: function(submenu) {
        this.item.addActor(submenu.actor, null, null);
    },

    setLabel: function(label) {
        this.item.label.set_text(label);
    }
};

Signals.addSignalMethods(CheckShellMenuItem.prototype);

function RadioShellMenuItem(group, prop) {
    this._init(group, prop);
}

/**
 * RadioShellMenuItem:
 * @prop: IBus.Property
 *
 * This class creates popupMenu.PopupMenuItem from @prop and
 * handles a dot image as a radio button likes gtk.RadioMenuItem.
 * It also emits the signal of 'property-activate' when it's activated.
 */
RadioShellMenuItem.prototype = {
    __proto__ : PropItem.PropItem.prototype,

    _init: function(group, prop) {
        PropItem.PropItem.prototype._init.call(this, prop);
        this._group = group;
        this._id = group.length;
        this.item = new PopupMenu.PopupMenuItem(this._prop.get_label().get_text());
        this.item.state = (this._prop.get_state() == IBus.PropState.CHECKED);
        this.item.setShowDot(this.item.state);
        this._activateId = this.item.connect('activate',
                                             Lang.bind(this, this._onActivate));

        if (prop.get_visible()) {
            this.item.actor.show();
        } else {
            this.item.actor.hide();
        }
    },

    _onActivate: function() {
        this.item.state = true;
        // Do not send property-activate to engine in case the event is
        // sent from engine.
        let do_emit = false;
        if (this._prop.get_state() != IBus.PropState.CHECKED) {
            do_emit = true;
        }
        this._prop.set_state(IBus.PropState.CHECKED);
        for (let i = 0; i < this._group.length; i++) {
            if (i != this._id) {
                this._group[i].setState(false);
            }
        }
        if (do_emit) {
            this.emit('property-activate', this._prop.get_key(), this._prop.get_state());
        }
    },

    propertyChanged: function() {
        this.setSensitive(this._prop.get_sensitive());
        if (this._prop.get_visible()) {
            this.item.actor.show();
        } else {
            this.item.actor.hide()
        }
    },

    show: function() {
        this.item.actor.show();
    },

    hide: function() {
        this.item.actor.hide();
    },

    destroy: function() {
        this.disconnect(this._activateId);
        this.item.destroy();
    },

    setSensitive: function(sensitive) {
        Common.actorSetSensitive(this.item.actor,
                                 sensitive,
                                 this.item.label);
    },

    setTooltipText: function(text) {
        this.item.actor.set_tooltip_text(text);
    },

    setSubmenu: function(submenu) {
        this.item.addActor(submenu.actor, null, null);
    },

    setLabel: function(label) {
        this.item.label.set_text(label);
    },

    setGroup: function(group) {
        this._group = group;
    },

    setState: function(state) {
        this.item.state = state;
        let do_emit = false;
        if (this.item.state) {
            if (this._prop.get_state() != IBus.PropState.CHECKED) {
                do_emit = true;
            }
            this._prop.set_state(IBus.PropState.CHECKED);
        } else {
            if (this._prop.get_state() != IBus.PropState.UNCHECKED) {
                do_emit = true;
            }
            this._prop.set_state(IBus.PropState.UNCHECKED);
        }
        if (do_emit) {
            this.emit('property-activate', this._prop.get_key(), this._prop.get_state());
        }
    }
};

Signals.addSignalMethods(RadioShellMenuItem.prototype);

function SeparatorShellMenuItem() {
    this._init();
}

/**
 * SeparatorShellMenuItem:
 *
 * This class creates popupMenu.PopupSeparatorMenuItem.
 */
SeparatorShellMenuItem.prototype = {
    __proto__ : PropItem.PropItem.prototype,

    _init: function() {
        PropItem.PropItem.prototype._init.call(this, null);
        this.item = new PopupMenu.PopupSeparatorMenuItem();
    },

    show: function() {
        this.item.actor.show();
    },

    destroy: function() {
        this.item.destroy();
    }
};


Signals.addSignalMethods(SeparatorShellMenuItem.prototype);
