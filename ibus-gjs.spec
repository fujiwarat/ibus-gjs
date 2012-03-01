%define ibus_version 1.3.99

Name:       ibus-gjs
Version:    3.2.1.20120229
Release:    1%{?dist}
Summary:    GNOME-Shell GJS Plugin for IBus
License:    LGPLv2+
Group:      System Environment/Libraries
URL:        http://code.google.com/p/ibus/
Source0:    http://ibus.googlecode.com/files/%{name}-%{version}.tar.gz
# Patch0:     ibus-HEAD.patch

BuildRoot:  %{_tmppath}/%{name}-%{version}-%{release}-root-%(%{__id_u} -n)


BuildRequires:  gjs
BuildRequires:  gnome-shell
BuildRequires:  ibus-devel >= %{ibus_version}
BuildRequires:  intltool

Requires:   gnome-shell
Requires:   ibus        >= %{ibus_version}
Requires:   ibus-libs   >= %{ibus_version}

%description
This is a transitional package which allows users to try out new IBus
GUI for GNOME3 in development.  Note that this package will be marked
as obsolete once the integration has completed in the GNOME3 upstream.

%prep
%setup -q
# %patch0 -p1

%build
%configure --disable-static

# make -C po update-gmo
make %{?_smp_mflags}

%install
rm -rf $RPM_BUILD_ROOT
make DESTDIR=$RPM_BUILD_ROOT install

%find_lang %{name}

%clean
rm -rf $RPM_BUILD_ROOT

%files -f %{name}.lang
%defattr(-,root,root,-)
%doc AUTHORS COPYING README
%{_datadir}/gnome-shell/js/ui/status/ibus

%changelog
* Wed Feb 29 2012 Takao Fujiwara <takao.fujiwara1@gmail.com> - 3.2.1.20120229-1
- Current version.
