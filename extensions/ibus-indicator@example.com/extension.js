/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

const Main = imports.ui.main;
const Panel = imports.ui.panel;

function main() {
    Panel.STANDARD_TRAY_ICON_ORDER.push('ibus');
    Panel.STANDARD_TRAY_ICON_SHELL_IMPLEMENTATION['ibus'] = imports.ui.status.ibus.indicator.Indicator;
}
