/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

const Main = imports.ui.main;
const Indicator = imports.ui.status.ibus.indicator;

let indicator = null;

function init() {
}

function enable() {
    if (!indicator) {
        indicator = new Indicator.Indicator();
        Main.panel.addToStatusArea('ibus', indicator, 0);
    }
}

function disable() {
    if (indicator) {
        indicator.destroy();
        indicator = null;
    }
}
