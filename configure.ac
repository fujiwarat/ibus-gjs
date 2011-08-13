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
AC_PREFEQ([2.62])

AC_CONFIG_HEADERS([config.h])
AC_CONFIG_MACRO_DIR([m4])


# if not 1, append datestamp to the version number.
m4_define([ibus_released], [0])
m4_define([ibus_major_version], [1])
m4_define([ibus_minor_version], [3])
m4_define([ibus_micro_version], [99])
m4_define(ibus_maybe_datestamp,
    m4_esyscmd([if test x]ibus_released[ != x1; then date +.%Y%m%d | tr -d '\n\r'; fi]))
m4_define([ibus_version],
    ibus_major_version.ibus_minor_version.ibus_micro_version[]ibus_maybe_datestamp)
# This is the X.Y used in -libus-X.Y
m4_define([ibus_api_version], [1.0])


AC_INIT([ibus-gjs], [ibus_version],
        [http://code.google.com/p/ibus/issues/entry],
        [ibus-gjs])

# Init automake
AM_INIT_AUTOMAKE([1.10])
AM_MAINTAINER_MODE([enable])
AC_GNU_SOURCE

# Define sustituted variables:
IBUS_MAJOR_VERSION=ibus_major_version
IBUS_MINOR_VERSION=ibus_minor_version
IBUS_MICRO_VERSION=ibus_micro_version
IBUS_API_VERSION=ibus_api_version
AC_SUBST(IBUS_MAJOR_VERSION)
AC_SUBST(IBUS_MINOR_VERSION)
AC_SUBST(IBUS_MICRO_VERSION)
AC_SUBST(IBUS_API_VERSION)

# Check for programs
AC_PROG_INSTALL

# define PACKAGE_VERSION_* variables
AM_PROG_LIBTOOL
IT_PROG_INTLTOOL([0.35.0])

# dislpay Date
m4_define(ibus_datedisplay,
    m4_esyscmd(date '+%a %b %d %Y' | tr -d '\n\r'))
DATE_DISPLAY="ibus_datedisplay"
AC_SUBST(DATE_DISPLAY)

# If only source code changed, lt_revision + 1
# If any interface added, lt_age + 1
# If any interfaces changed or removed, lt_current + 1, lt_revision = 0, lt_age = 0
m4_define([lt_current], [0])
m4_define([lt_revision], [0])
m4_define([lt_age], [0])
LT_VERSION_INFO="lt_current:lt_revision:lt_age"
AC_SUBST(LT_VERSION_INFO)

# check standalone
AC_MSG_CHECKING([whether you enable standalone])
AC_ARG_ENABLE(standalone,
              AS_HELP_STRING([--enable-standalone=yes/no],
                             [Use this package with standalone default=yes]),
              ENABLE_STANDALONE=yes,
              ENABLE_STANDALONE=yes)
AC_SUBST(ENABLE_STANDALONE)
AC_MSG_RESULT($ENABLE_STANDALONE)

if test "x$ac_cv_env_PKG_CONFIG_set" != "xset"; then
        AC_PATH_TOOL([PKG_CONFIG], [pkg-config])
fi

AC_MSG_CHECKING([for IBus parameters])
IBUS_PC_NAME=ibus-1.0
if $PKG_CONFIG --exists $IBUS_PC_NAME ; then
    IBUS_PREFIX=`$PKG_CONFIG --variable prefix $IBUS_PC_NAME`
    IBUS_PKGDATADIR=`$PKG_CONFIG --variable pkgdatadir $IBUS_PC_NAME`
    IBUS_XKB=`$PKG_CONFIG --variable ibus_xkb $IBUS_PC_NAME`
    HAVE_IBUS_XKB=`$PKG_CONFIG --variable have_ibus_xkb $IBUS_PC_NAME`
    if test x"$HAVE_IBUS_XKB" != xtrue ; then
        HAVE_IBUS_XKB=false
    fi
    AC_MSG_RESULT([yes
                   IBUS_PKGDATADIR=$IBUS_PKGDATADIR
                   IBUS_PREFIX=$IBUS_PREFIX
                   IBUS_XKB=$IBUS_XKB
                   HAVE_IBUS_XKB=$HAVE_IBUS_XKB])
else
    IBUS_PREFIX=$prefix
    IBUS_PKGDATADIR=$datadir/ibus
    IBUS_XKB=
    HAVE_IBUS_XKB=false
    AC_MSG_RESULT([no
                   IBUS_PKGDATADIR=$IBUS_PKGDATADIR
                   IBUS_PREFIX=$IBUS_PREFIX
                   IBUS_XKB=$IBUS_XKB
                   HAVE_IBUS_XKB=$HAVE_IBUS_XKB])
fi
AC_SUBST(IBUS_PREFIX)
AC_SUBST(IBUS_PKGDATADIR)
AC_SUBST(IBUS_XKB)
AC_SUBST(HAVE_IBUS_XKB)

# Check GNOME-Shell VERSION
AC_ARG_WITH(gnome-shell-js-dir,
    AS_HELP_STRING([--with-gnome-shell-js-dir[=$DIR]],
        [Set js dir path (default: /usr/share/gnome-shell/js)]),
    GNOME_SHELL_JS_DIR=$with_gnome_shell_js_dir,
    GNOME_SHELL_JS_DIR="/usr/share/gnome-shell/js"
)

# versionCheck() in gnome-shell/js/ui/extensionSystem.js:
#  @current must be in the format <major>.<minor>.<point>.<micro>
#  <micro> is always ignored
#  <point> is ignored if <minor> is even (so you can target the
#  whole stable release)
#  <minor> and <major> must match
#  Each target version must be at least <major> and <minor>
GJS=${GJS:-'gjs'}
GREP=${GREP:-'grep'}
GET_JS_VERSION () {
    VERSION_STRING=$1
    CHECK_JS_VERSION_TEMPLATE="
try {
    const Config = imports.misc.config;
    let required = ${VERSION_STRING};
    let requiredArray = required.split('.');
    if (requiredArray[[1]] == undefined) {
        print (required);
    }
    else if (requiredArray[[1]] % 2 == 0) {
        print (requiredArray[[0]] + '.' + requiredArray[[1]]);
    }
    else if (requiredArray[[2]] == undefined || requiredArray[[3]] == undefined) {
        print (required);
    }
    else {
        let version = requiredArray[[0]];
        version = version + '.' + requiredArray[[1]];
        version = version + '.' + requiredArray[[2]];
        print (version);
    }
} catch (e) {
}
"
    # Added a workaround with tail.
    # GJS 0.7.14 has unnecessary strings of
    # "DEBUG: Command line: gjs" and
    # "DEBUG: Creating new context to eval console script"
    $GJS -I "$GNOME_SHELL_JS_DIR" -c "$CHECK_JS_VERSION_TEMPLATE" |\
        $GREP -v "DEBUG:"
}

GNOME_SHELL_VERSION=`GET_JS_VERSION 'Config.PACKAGE_VERSION'`
GJS_VERSION=`GET_JS_VERSION 'Config.GJS_VERSION'`
AC_SUBST(GNOME_SHELL_VERSION)
AC_SUBST(GJS_VERSION)

# define GETTEXT_* variables
GETTEXT_PACKAGE=ibus-gjs
AC_SUBST(GETTEXT_PACKAGE)
AC_DEFINE_UNQUOTED(GETTEXT_PACKAGE,"$GETTEXT_PACKAGE", [Gettext package])

AM_GLIB_GNU_GETTEXT

# OUTPUT files
AC_CONFIG_FILES([ po/Makefile.in
Makefile
ibus-gjs.spec
js/Makefile
js/misc/config.js
extensions/Makefile
extensions/ibus-indicator@example.com/metadata.json
])

AC_OUTPUT
AC_MSG_RESULT([
Build options:
  Version                   $VERSION
  Install prefix            $prefix
  Enable standalone         $ENABLE_STANDALONE
  IBus PKGDATADIR           $IBUS_PKGDATADIR
  IBus PREFIX               $IBUS_PREFIX
  HAVE IBus XKB             $HAVE_IBUS_XKB
  IBUS XKB                  $IBUS_XKB
  GNOME_SHELL_VERSION       $GNOME_SHELL_VERSION
  GJS_VERSION               $GJS_VERSION
])

