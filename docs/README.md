# Tab Bookmarks for VS Code

A powerful VS Code extension that allows you to bookmark tabs, organize them into groups, and quickly navigate between your important files.

## Features

- **Bookmark Tabs**: Save your important files as bookmarks for quick access later
- **Group Organization**: Create groups to organize related bookmarks
- **Nested Groups**: Create hierarchical organization with nested groups
- **Group Operations**: Open or close all files in a group with a single click
- **Rich Descriptions**: Add descriptions to both bookmarks and groups
- **File Preview**: Preview files before opening them
- **Import/Export**: Share your bookmarks with others or across different machines
- **Synchronization**: Automatically sync your bookmarks across VS Code instances

## How to Use

### Bookmarking Files

1. Open a file you want to bookmark
2. Click the bookmark icon in the editor title bar or use the command palette to run "Bookmark Current Tab"
3. Enter a name and optional description for the bookmark
4. Select a group (optional)

### Managing Bookmarks

All your bookmarks are visible in the Tab Bookmarks view in the Activity Bar. From there, you can:

- Click on a bookmark to open the file
- Right-click on a bookmark for additional options:
  - Remove the bookmark
  - Add it to a group
  - Edit its description

### Working with Groups

Groups help you organize related bookmarks:

- Create a new group using the "+" button in the view header
- Right-click on a group for options:
  - Rename the group
  - Add/edit a description
  - Open all files in the group
  - Close all files in the group
  - Preview files in the group
  - Delete the group

### Nested Groups

You can create nested groups for more complex organization:

1. Right-click on an existing group
2. Select "Create Bookmark Group" to create a child group

### Import/Export

Share your bookmarks across machines or with team members:

- Export: Click the export icon in the view header
- Import: Click the import icon and select a previously exported file

## Extension Settings

This extension contributes the following settings:

* `tabBookmarks.syncEnabled`: Enable/disable syncing bookmarks across VS Code instances
* `tabBookmarks.showInEditor`: Show/hide bookmark icon in editor title

## Known Issues

Please report any issues on the [GitHub repository](https://github.com/yourusername/tab-bookmarks/issues).

## Release Notes

### 0.1.0

- Initial release of Tab Bookmarks

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This extension is licensed under the [MIT License](LICENSE).
