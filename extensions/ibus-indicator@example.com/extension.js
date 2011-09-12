/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PopupMenu = imports.ui.popupMenu;
const Indicator = imports.ui.status.ibus.indicator;

let indicator = null;
let menus = null;

function init() {
}

function main() {
    // The gettext is fixed in gnome-shell 3.1.4 or later at least.
    if (window._ == undefined) {
        const Shell = imports.gi.Shell;
        const Gettext = imports.gettext;
        window.global = Shell.Global.get();
        window._ = Gettext.gettext;
        window.C_ = Gettext.pgettext;
        window.ngettext = Gettext.ngettext;
    }
    Panel.STANDARD_TRAY_ICON_ORDER.push('ibus');
    Panel.STANDARD_TRAY_ICON_SHELL_IMPLEMENTATION['ibus'] = Indicator.Indicator;
}

function enable() {
    if (!indicator) {
        indicator = new Indicator.Indicator();
    }
    if (!menus) {
        menus = new PopupMenu.PopupMenuManager(indicator);
    }
    menus.addMenu(indicator.menu);
    Main.statusIconDispatcher.emit('status-icon-added', indicator.actor, 'ibus');
}

function disable() {
    if (indicator) {
        if (menus) {
            menus.removeMenu(indicator.menu);
            menus = null;
        }
        Main.statusIconDispatcher.emit('status-icon-removed', indicator.actor);
        indicator = null;
    }
}
