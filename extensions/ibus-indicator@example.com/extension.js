/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

const Main = imports.ui.main;
const Panel = imports.ui.panel;

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
    Panel.STANDARD_TRAY_ICON_SHELL_IMPLEMENTATION['ibus'] = imports.ui.status.ibus.indicator.Indicator;
}
