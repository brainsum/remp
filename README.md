REMP CRM module
---------------------

* Introduction
* Requirements
* Recommended Modules
* Installation
* Configuration
* Maintainers


INTRODUCTION
------------

This module integrates a Drupal site with REMP CRM. This module
allows sites to only view to REMP mebers.

REQUIREMENTS
------------

This module requires no modules outside of Drupal core.


RECOMMENDED MODULES
-------------------

Here redis and varnish informations.

INSTALLATION
------------

Install the remp module as you would normally install a contributed Drupal
module. Visit https://www.drupal.org/node/1897420 for further information.

After module enabled needs to add remp_member_only field to content type where needs to handle access for view.


CONFIGURATION
--------------

    1. Navigate to Administration > Extend and enable the REMP module.
    2. Navigate to Administration > Structure > Content types.
    3. Add remp_member_only field to bundle where needs to handle access for view.
    4. Navigate to node bundle display view admin page and enable anonym display mode.
    5. Change display mode to Anonym and set as you need. Anonym users will see this display mode.

Add new content and check in the remp_member_only field.

MAINTAINERS
-----------

The 8.x branch was created by:

 * Jozsef Dudas (dj1999) - https://www.drupal.org/u/dj1999
 * Levente Besenyei () - 

This module was created and sponsored by Brainsum, a Drupal development company
in Budapest, Hungary.

 * Brainsum - https://www.brainsum.hu/
