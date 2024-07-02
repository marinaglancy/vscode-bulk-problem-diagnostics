# Change Log

All notable changes to the "Bulk Problem Diagnostics" extension will be documented in this file.

## [1.0.7]
- Due to the recent changes in some extensions (including ESLint 3.0.8), the previous method of
  opening the files in the background does not work anymore. Now the extension will open files
  in the editor and close them after a delay. This means there is a lot of "blinking" on the
  screen as each file is being opened and closed. #4
- Added a new setting "Wait Before Closing", by default 3000ms.
- Default value for the "Delay" setting was raised to 200ms.

## [1.0.6]
- Added progress bar, cancel button and remaining time countdown
- Allow to search in error codes as well as error messages
- Automatically open Problems View when the command is executed

## [1.0.5]
- changes to README and a new icon

## [1.0.4]
- Fixed a problem when files are not re-analysed if the command runs on a small folder
  for the second time. As a downside, on consequtive runs the screen might be blinking
  since the files will be opened and closed in the browser.

## [1.0.2]
- Allow to run the command on the whole project, not just one folder

## [1.0.1]
- Open only files with problems
- Added settings to match problems severity and error message

## [1.0.0]
- Initial release