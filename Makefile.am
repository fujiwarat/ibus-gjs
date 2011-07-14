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

SUBDIRS = js extensions po

EXTRA_DIST =		\
	autogen.sh	\
	data/theme/gnome-shell.css \
	$(NULL)

# These are files checked into Git that we don't want to distribute
DIST_EXCLUDE =					\
	.gitignore				\
	$(NULL)

dist-hook:
	if test -d .git ; then \
	    git log --name-status --date=iso > $(distdir)/ChangeLog ; \
	fi

