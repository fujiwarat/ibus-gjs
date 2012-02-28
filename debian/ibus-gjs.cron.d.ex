#
# Regular cron jobs for the ibus-gjs package
#
0 4	* * *	root	[ -x /usr/bin/ibus-gjs_maintenance ] && /usr/bin/ibus-gjs_maintenance
