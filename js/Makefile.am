# vim:set et ts=4:
#
# ibus-gjs - GNOME-Shell GJS Plugin for IBus
#
# Copyright (c) 2011 Takao Fujiwara <takao.fujiwara1@gmail.com>
# Copyright (c) 2011 Red Hat, Inc.
#
# This library is free software; you can redistribute it and/or
# modify it under the terms of the GNU Lesser General Public
# License as published by the Free Software Foundation; either
# version 2 of the License, or (at your option) any later version.
#
# This library is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Lesser General Public License for more details.
#
# You should have received a copy of the GNU Lesser General Public
# License along with this program; if not, write to the
# Free Software Foundation, Inc., 59 Temple Place, Suite 330,
# Boston, MA  02111-1307  USA

jsdir = $(datadir)/gnome-shell/js

nobase_dist_js_DATA = 	\
	ui/status/ibus/candidatePanel.js	\
	ui/status/ibus/common.js	\
	ui/status/ibus/ibusPanel.js	\
	ui/status/ibus/indicator.js	\
	ui/status/ibus/languageBar.js	\
	ui/status/ibus/panelMenu.js	\
	ui/status/ibus/popupMenu.js	\
	ui/status/ibus/propItem.js	\
	ui/status/ibus/shellMenu.js \
	ui/status/ibus/xkbLayout.js	\
	$(NULL)

ui/status/ibus/xkbLayout.js: ui/status/ibus/xkbLayout.js.in
	@if test x"$(ENABLE_STANDALONE)" = xyes; then \
	    sed -e "s|Config.IBUS_XKB|'$(IBUS_XKB)'|g" \
	        -e "s|Config.HAVE_IBUS_XKB|$(HAVE_IBUS_XKB)|g" \
	    $< > $@; \
	else \
	    cp $< $@; \
	fi;

ui/status/ibus/ibusPanel.js: ui/status/ibus/ibusPanel.js.in
	@if test x"$(ENABLE_STANDALONE)" = xyes; then \
	    sed -e "s|Config.HAVE_IBUS_XKB|$(HAVE_IBUS_XKB)|g" \
	    $< > $@; \
	else \
	    cp $< $@; \
	fi;

EXTRA_DIST = \
	misc/config.js.in		\
	ui/status/ibus/ibusPanel.js.in	\
	ui/status/ibus/xkbLayout.js.in	\
	$(NULL)

CLEANFILES = \
	ui/status/ibus/ibusPanel.js		\
	ui/status/ibus/xkbLayout.js	\
	$(NULL)
