#!/bin/bash
mysql -u root -p'123456' -e "GRANT ALL ON asset_platform.* TO 'root'@'%' IDENTIFIED BY '123456'; FLUSH PRIVILEGES;"
