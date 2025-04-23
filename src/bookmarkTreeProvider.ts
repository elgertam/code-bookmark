import * as vscode from 'vscode';
import * as path from 'path';
import { BookmarkManager } from './bookmarkManager';
import { Bookmark } from './bookmark';
import { BookmarkGroup } from './bookmarkGroup';

/**
 * Tree item for the bookmark tree view
 */
export class BookmarkTreeItem extends vscode.TreeItem {
    /**
     * Creates a new bookmark tree item
     * 
     * @param label Label for the tree item
     * @param collapsibleState Whether the item is collapsible
     * @param bookmark Associated bookmark (if any)
     * @param group Associated group (if any)
     */
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly bookmark?: Bookmark,
        public readonly group?: BookmarkGroup
    ) {
        super(label, collapsibleState);
        
        if (bookmark) {
            this.contextValue = 'bookmark';
            this.tooltip = bookmark.description || bookmark.name;
            this.description = bookmark.description ? bookmark.description : path.basename(path.dirname(bookmark.uri.fsPath));
            this.iconPath = new vscode.ThemeIcon('bookmark');
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [bookmark.uri]
            };
        } else if (group) {
            this.contextValue = 'group';
            this.tooltip = group.description || group.name;
            this.description = group.description;
            this.iconPath = new vscode.ThemeIcon('folder');
            
            // Don't add a command to groups
        }
    }
}

/**
 * Tree data provider for the bookmark explorer
 */
export class BookmarkTreeProvider implements vscode.TreeDataProvider<BookmarkTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<BookmarkTreeItem | undefined | null | void> = new vscode.EventEmitter<BookmarkTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<BookmarkTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    /**
     * Creates a new bookmark tree provider
     * 
     * @param bookmarkManager Bookmark manager containing the data
     */
    constructor(private bookmarkManager: BookmarkManager) {
        // Refresh when bookmark data changes
        this.bookmarkManager.onDidChangeData(() => {
            this.refresh();
        });
    }
    
    /**
     * Refreshes the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Gets tree item for an element
     * 
     * @param element Tree item
     * @returns Tree item representation
     */
    getTreeItem(element: BookmarkTreeItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Gets children for a tree item
     * 
     * @param element Tree item to get children for, or undefined for root
     * @returns Children elements
     */
    getChildren(element?: BookmarkTreeItem): Thenable<BookmarkTreeItem[]> {
        if (element) {
            // Handle child elements
            if (element.group) {
                const items: BookmarkTreeItem[] = [];
                
                // Add child groups
                for (const childGroup of element.group.groups) {
                    items.push(new BookmarkTreeItem(
                        childGroup.name,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        undefined,
                        childGroup
                    ));
                }
                
                // Add bookmarks in the group
                for (const bookmark of element.group.bookmarks) {
                    items.push(new BookmarkTreeItem(
                        bookmark.name,
                        vscode.TreeItemCollapsibleState.None,
                        bookmark
                    ));
                }
                
                return Promise.resolve(items);
            }
            
            return Promise.resolve([]);
        } else {
            // Handle root elements
            const items: BookmarkTreeItem[] = [];
            
            // Add root groups
            for (const group of this.bookmarkManager.getGroups()) {
                items.push(new BookmarkTreeItem(
                    group.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    undefined,
                    group
                ));
            }
            
            // Add root bookmarks
            for (const bookmark of this.bookmarkManager.getBookmarks()) {
                items.push(new BookmarkTreeItem(
                    bookmark.name,
                    vscode.TreeItemCollapsibleState.None,
                    bookmark
                ));
            }
            
            // If there are no items, add a placeholder
            if (items.length === 0) {
                const item = new vscode.TreeItem('No bookmarks yet');
                item.contextValue = 'emptyMessage';
                items.push(item);
            }
            
            return Promise.resolve(items);
        }
    }
    
    /**
     * Gets parent for a tree item
     * 
     * @param element Tree item to get parent for
     * @returns Parent tree item or undefined
     */
    getParent(element: BookmarkTreeItem): vscode.ProviderResult<BookmarkTreeItem> {
        if (element.group && element.group.parent) {
            return new BookmarkTreeItem(
                element.group.parent.name,
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                element.group.parent
            );
        }
        
        return null;
    }
}
