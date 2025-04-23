import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BookmarkManager } from './bookmarkManager';
import { BookmarkTreeProvider } from './bookmarkTreeProvider';
import { Bookmark } from './bookmark';
import { BookmarkGroup } from './bookmarkGroup';

/**
 * Activates the extension
 * 
 * @param context Extension context
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Tab Bookmarks extension is now active');
    
    // Create bookmark manager
    const bookmarkManager = new BookmarkManager(context);
    
    // Create tree data provider
    const treeDataProvider = new BookmarkTreeProvider(bookmarkManager);
    
    // Register the tree data provider
    const treeView = vscode.window.createTreeView('bookmarkExplorer', {
        treeDataProvider,
        showCollapseAll: true,
        canSelectMany: false
    });
    
    context.subscriptions.push(treeView);
    
    // Register commands
    registerCommands(context, bookmarkManager, treeDataProvider, treeView);
    
    // Return API for other extensions
    return {
        bookmarkManager
    };
}

/**
 * Registers all extension commands
 * 
 * @param context Extension context
 * @param bookmarkManager Bookmark manager
 * @param treeDataProvider Tree data provider
 * @param treeView Tree view
 */
function registerCommands(
    context: vscode.ExtensionContext,
    bookmarkManager: BookmarkManager,
    treeDataProvider: BookmarkTreeProvider,
    treeView: vscode.TreeView<any>
) {
    // Bookmark current tab
    const bookmarkCurrentTabCommand = vscode.commands.registerCommand('tabBookmarks.bookmarkCurrentTab', async () => {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            vscode.window.showWarningMessage('No active editor to bookmark');
            return;
        }
        
        const uri = editor.document.uri;
        
        // Check if file is already bookmarked
        if (bookmarkManager.isFileBookmarked(uri)) {
            const result = await vscode.window.showQuickPick(['Add Another Bookmark', 'Cancel'], {
                placeHolder: 'File is already bookmarked. What would you like to do?'
            });
            
            if (result !== 'Add Another Bookmark') {
                return;
            }
        }
        
        // Get name and description
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a name for this bookmark',
            placeHolder: 'Bookmark name',
            value: path.basename(uri.fsPath)
        });
        
        if (!name) {
            return;
        }
        
        const description = await vscode.window.showInputBox({
            prompt: 'Enter a description for this bookmark (optional)',
            placeHolder: 'Bookmark description'
        });
        
        // Get group
        const groups = bookmarkManager.getAllGroups();
        const groupQuickPicks = [
            { label: 'No Group', description: 'Add to root', id: null },
            ...groups.map(group => ({
                label: group.name,
                description: group.description || '',
                id: group.id
            }))
        ];
        
        const selectedGroup = await vscode.window.showQuickPick(groupQuickPicks, {
            placeHolder: 'Select a group for this bookmark',
            ignoreFocusOut: true
        });
        
        if (!selectedGroup) {
            return;
        }
        
        // Add bookmark
        bookmarkManager.addBookmark(uri, name, description || '', selectedGroup.id || undefined);
        
        vscode.window.showInformationMessage(`Bookmarked: ${name}`);
    });
    
    // Remove bookmark
    const removeBookmarkCommand = vscode.commands.registerCommand('tabBookmarks.removeBookmark', async (item) => {
        if (item && item.bookmark) {
            const bookmark = item.bookmark;
            
            const confirmed = await vscode.window.showWarningMessage(
                `Are you sure you want to remove the bookmark "${bookmark.name}"?`,
                { modal: true },
                'Yes'
            );
            
            if (confirmed === 'Yes') {
                bookmarkManager.removeBookmark(bookmark.id);
                vscode.window.showInformationMessage(`Bookmark removed: ${bookmark.name}`);
            }
        }
    });
    
    // Create group
    const createGroupCommand = vscode.commands.registerCommand('tabBookmarks.createGroup', async (item) => {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a name for the new group',
            placeHolder: 'Group name'
        });
        
        if (!name) {
            return;
        }
        
        const description = await vscode.window.showInputBox({
            prompt: 'Enter a description for the group (optional)',
            placeHolder: 'Group description'
        });
        
        let parentId: string | undefined = undefined;
        
        // If the command was invoked with an item, use it as the parent group
        if (item && item.group) {
            parentId = item.group.id;
        }
        
        const group = bookmarkManager.createGroup(name, description, parentId);
        vscode.window.showInformationMessage(`Group created: ${name}`);
    });
    
    // Delete group
    const deleteGroupCommand = vscode.commands.registerCommand('tabBookmarks.deleteGroup', async (item) => {
        if (item && item.group) {
            const group = item.group;
            
            const confirmed = await vscode.window.showWarningMessage(
                `Are you sure you want to delete the group "${group.name}" and all its contents?`,
                { modal: true },
                'Yes'
            );
            
            if (confirmed === 'Yes') {
                bookmarkManager.removeGroup(group.id);
                vscode.window.showInformationMessage(`Group deleted: ${group.name}`);
            }
        }
    });
    
    // Rename group
    const renameGroupCommand = vscode.commands.registerCommand('tabBookmarks.renameGroup', async (item) => {
        if (item && item.group) {
            const group = item.group;
            
            const name = await vscode.window.showInputBox({
                prompt: 'Enter a new name for the group',
                placeHolder: 'Group name',
                value: group.name
            });
            
            if (!name) {
                return;
            }
            
            bookmarkManager.updateGroup(group.id, name);
            vscode.window.showInformationMessage(`Group renamed to: ${name}`);
        }
    });
    
    // Add/edit description
    const addDescriptionCommand = vscode.commands.registerCommand('tabBookmarks.addDescription', async (item) => {
        if (item && item.group) {
            const group = item.group;
            
            const description = await vscode.window.showInputBox({
                prompt: 'Enter a description for the group',
                placeHolder: 'Group description',
                value: group.description
            });
            
            if (description === undefined) {
                return;
            }
            
            bookmarkManager.updateGroup(group.id, undefined, description);
            vscode.window.showInformationMessage(`Description updated for: ${group.name}`);
        }
    });
    
    // Open group
    const openGroupCommand = vscode.commands.registerCommand('tabBookmarks.openGroup', async (item) => {
        if (item && item.group) {
            const group = item.group;
            
            await group.openAll();
            vscode.window.showInformationMessage(`Opened all files in group: ${group.name}`);
        }
    });
    
    // Close group
    const closeGroupCommand = vscode.commands.registerCommand('tabBookmarks.closeGroup', async (item) => {
        if (item && item.group) {
            const group = item.group;
            
            await group.closeAll();
            vscode.window.showInformationMessage(`Closed all files in group: ${group.name}`);
        }
    });
    
    // Preview group
    const previewGroupCommand = vscode.commands.registerCommand('tabBookmarks.previewGroup', async (item) => {
        if (item && item.group) {
            const group = item.group;
            const bookmarks = group.getAllBookmarks();
            
            if (bookmarks.length === 0) {
                vscode.window.showInformationMessage(`Group "${group.name}" is empty`);
                return;
            }
            
            // Create a preview QuickPick
            const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem & { bookmark: Bookmark }>();
            quickPick.title = `Preview Files in Group: ${group.name}`;
            quickPick.placeholder = 'Select a file to open';
            
            // Add items
            quickPick.items = bookmarks.map((bookmark: Bookmark) => ({
                label: bookmark.name,
                description: path.relative(vscode.workspace.rootPath || '', bookmark.uri.fsPath),
                detail: bookmark.description || undefined,
                bookmark
            }));
            
            // Add actions
            quickPick.buttons = [
                {
                    iconPath: new vscode.ThemeIcon('folder-opened'),
                    tooltip: 'Open All Files'
                }
            ];
            
            // Handle selection
            quickPick.onDidAccept(async () => {
                const selectedItem = quickPick.selectedItems[0];
                if (selectedItem && selectedItem.bookmark) {
                    await selectedItem.bookmark.open();
                    quickPick.hide();
                }
            });
            
            // Handle button clicks
            quickPick.onDidTriggerButton(async button => {
                if (button === quickPick.buttons[0]) {
                    await group.openAll();
                    quickPick.hide();
                }
            });
            
            quickPick.show();
        }
    });
    
    // Export bookmarks
    const exportBookmarksCommand = vscode.commands.registerCommand('tabBookmarks.exportBookmarks', async () => {
        const json = bookmarkManager.exportToJSON();
        
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('tab-bookmarks-export.json'),
            filters: {
                'JSON Files': ['json']
            }
        });
        
        if (uri) {
            try {
                fs.writeFileSync(uri.fsPath, json);
                vscode.window.showInformationMessage(`Bookmarks exported to: ${uri.fsPath}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to export bookmarks: ${error instanceof Error ? error.message : 'Unknown error'}`);

            }
        }
    });
    
    // Import bookmarks
    const importBookmarksCommand = vscode.commands.registerCommand('tabBookmarks.importBookmarks', async () => {
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false,
            filters: {
                'JSON Files': ['json']
            }
        });
        
        if (!uris || uris.length === 0) {
            return;
        }
        
        const uri = uris[0];
        
        try {
            const jsonData = fs.readFileSync(uri.fsPath, 'utf8');
            
            const mergeOptions = ['Replace All', 'Merge with Existing'];
            const mergeChoice = await vscode.window.showQuickPick(mergeOptions, {
                placeHolder: 'How do you want to import bookmarks?'
            });
            
            if (!mergeChoice) {
                return;
            }
            
            const merge = mergeChoice === 'Merge with Existing';
            
            if (bookmarkManager.importFromJSON(jsonData, merge)) {
                vscode.window.showInformationMessage(`Bookmarks imported from: ${uri.fsPath}`);
            } else {
                vscode.window.showErrorMessage('Failed to import bookmarks. Invalid format.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to import bookmarks: ${error instanceof Error ? error.message : 'Unknown error'}`);

        }
    });
    
    // Add to group
    const addToGroupCommand = vscode.commands.registerCommand('tabBookmarks.addToGroup', async (item) => {
        if (item && item.bookmark) {
            const bookmark = item.bookmark;
            
            // Get available groups
            const groups = bookmarkManager.getAllGroups();
            
            if (groups.length === 0) {
                const createNewGroup = await vscode.window.showQuickPick(['Create New Group', 'Cancel'], {
                    placeHolder: 'No groups available. Create a new group?'
                });
                
                if (createNewGroup === 'Create New Group') {
                    vscode.commands.executeCommand('tabBookmarks.createGroup');
                }
                
                return;
            }
            
            const groupQuickPicks = groups.map(group => ({
                label: group.name,
                description: group.description || '',
                id: group.id
            }));
            
            const selectedGroup = await vscode.window.showQuickPick(groupQuickPicks, {
                placeHolder: 'Select a group for this bookmark',
                ignoreFocusOut: true
            });
            
            if (!selectedGroup) {
                return;
            }
            
            if (bookmarkManager.moveBookmarkToGroup(bookmark.id, selectedGroup.id)) {
                vscode.window.showInformationMessage(
                    `Moved "${bookmark.name}" to group "${selectedGroup.label}"`
                );
            } else {
                vscode.window.showErrorMessage('Failed to move bookmark to group');
            }
        }
    });
    
    // Refresh view
    const refreshCommand = vscode.commands.registerCommand('tabBookmarks.refresh', () => {
        treeDataProvider.refresh();
    });
    
    // Register all commands
    context.subscriptions.push(
        bookmarkCurrentTabCommand,
        removeBookmarkCommand,
        createGroupCommand,
        deleteGroupCommand,
        renameGroupCommand,
        addDescriptionCommand,
        openGroupCommand,
        closeGroupCommand,
        previewGroupCommand,
        exportBookmarksCommand,
        importBookmarksCommand,
        addToGroupCommand,
        refreshCommand
    );
}

/**
 * Deactivates the extension
 */
export function deactivate() {
    console.log('Tab Bookmarks extension deactivated');
}
