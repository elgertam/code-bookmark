import * as vscode from 'vscode';
import { Bookmark } from './bookmark';
import { BookmarkGroup } from './bookmarkGroup';

/**
 * Core class that manages all bookmarks and groups
 */
export class BookmarkManager {
    /**
     * All root-level groups
     */
    private groups: BookmarkGroup[];
    
    /**
     * Ungrouped bookmarks
     */
    private bookmarks: Bookmark[];
    
    /**
     * Event emitter for when bookmarks or groups change
     */
    private _onDidChangeData: vscode.EventEmitter<void>;
    
    /**
     * Event that fires when bookmarks or groups change
     */
    public readonly onDidChangeData: vscode.Event<void>;
    
    /**
     * Extension's context for storage
     */
    private context: vscode.ExtensionContext;
    
    /**
     * Creates a new bookmark manager
     * 
     * @param context Extension context for state persistence
     */
    constructor(context: vscode.ExtensionContext) {
        this.groups = [];
        this.bookmarks = [];
        this._onDidChangeData = new vscode.EventEmitter<void>();
        this.onDidChangeData = this._onDidChangeData.event;
        this.context = context;
        
        // Load saved state
        this.loadState();
    }
    
    /**
     * Gets all root bookmarks
     */
    getBookmarks(): Bookmark[] {
        return [...this.bookmarks];
    }
    
    /**
     * Gets all root groups
     */
    getGroups(): BookmarkGroup[] {
        return [...this.groups];
    }
    
    /**
     * Adds a new bookmark
     * 
     * @param uri URI of the file to bookmark
     * @param name Optional name for the bookmark
     * @param description Optional description for the bookmark
     * @param groupId Optional ID of the group to add the bookmark to
     * @returns The newly created bookmark
     */
    addBookmark(uri: vscode.Uri, name?: string, description?: string, groupId?: string): Bookmark {
        const bookmark = new Bookmark(uri, name, description);
        
        if (groupId) {
            const group = this.findGroupById(groupId);
            if (group) {
                group.addBookmark(bookmark);
            } else {
                this.bookmarks.push(bookmark);
            }
        } else {
            this.bookmarks.push(bookmark);
        }
        
        this._onDidChangeData.fire();
        this.saveState();
        
        return bookmark;
    }
    
    /**
     * Removes a bookmark
     * 
     * @param id ID of the bookmark to remove
     * @returns true if the bookmark was removed, false otherwise
     */
    removeBookmark(id: string): boolean {
        // Check in root bookmarks
        const initialLength = this.bookmarks.length;
        this.bookmarks = this.bookmarks.filter(b => b.id !== id);
        
        let removed = initialLength !== this.bookmarks.length;
        
        // If not found in root bookmarks, check in groups
        if (!removed) {
            for (const group of this.getAllGroups()) {
                if (group.removeBookmark(id)) {
                    removed = true;
                    break;
                }
            }
        }
        
        if (removed) {
            this._onDidChangeData.fire();
            this.saveState();
        }
        
        return removed;
    }
    
    /**
     * Creates a new group
     * 
     * @param name Name of the group
     * @param description Optional description for the group
     * @param parentId Optional ID of the parent group
     * @returns The newly created group
     */
    createGroup(name: string, description?: string, parentId?: string): BookmarkGroup {
        const group = new BookmarkGroup(name, description);
        
        if (parentId) {
            const parentGroup = this.findGroupById(parentId);
            if (parentGroup) {
                parentGroup.addGroup(group);
            } else {
                this.groups.push(group);
            }
        } else {
            this.groups.push(group);
        }
        
        this._onDidChangeData.fire();
        this.saveState();
        
        return group;
    }
    
    /**
     * Removes a group
     * 
     * @param id ID of the group to remove
     * @returns true if the group was removed, false otherwise
     */
    removeGroup(id: string): boolean {
        // Check in root groups
        const initialLength = this.groups.length;
        this.groups = this.groups.filter(g => g.id !== id);
        
        let removed = initialLength !== this.groups.length;
        
        // If not found in root groups, check in child groups
        if (!removed) {
            for (const group of this.getAllGroups()) {
                if (group.removeGroup(id)) {
                    removed = true;
                    break;
                }
            }
        }
        
        if (removed) {
            this._onDidChangeData.fire();
            this.saveState();
        }
        
        return removed;
    }
    
    /**
     * Updates a group's properties
     * 
     * @param id ID of the group to update
     * @param name New name for the group
     * @param description New description for the group
     * @returns true if the group was updated, false otherwise
     */
    updateGroup(id: string, name?: string, description?: string): boolean {
        const group = this.findGroupById(id);
        
        if (group) {
            if (name !== undefined) {
                group.name = name;
            }
            
            if (description !== undefined) {
                group.description = description;
            }
            
            this._onDidChangeData.fire();
            this.saveState();
            return true;
        }
        
        return false;
    }
    
    /**
     * Finds a bookmark by its ID
     * 
     * @param id ID of the bookmark to find
     * @returns The bookmark, or undefined if not found
     */
    findBookmarkById(id: string): Bookmark | undefined {
        // Check in root bookmarks
        let bookmark = this.bookmarks.find(b => b.id === id);
        
        // If not found in root bookmarks, check in groups
        if (!bookmark) {
            for (const group of this.getAllGroups()) {
                bookmark = group.bookmarks.find(b => b.id === id);
                if (bookmark) {
                    break;
                }
            }
        }
        
        return bookmark;
    }
    
    /**
     * Finds a group by its ID
     * 
     * @param id ID of the group to find
     * @returns The group, or undefined if not found
     */
    findGroupById(id: string): BookmarkGroup | undefined {
        // Check in root groups
        let group = this.groups.find(g => g.id === id);
        
        // If not found in root groups, check in child groups
        if (!group) {
            for (const rootGroup of this.groups) {
                group = this.findGroupByIdRecursive(rootGroup, id);
                if (group) {
                    break;
                }
            }
        }
        
        return group;
    }
    
    /**
     * Recursively searches for a group by ID
     * 
     * @param currentGroup Group to search in
     * @param id ID of the group to find
     * @returns The group, or undefined if not found
     */
    private findGroupByIdRecursive(currentGroup: BookmarkGroup, id: string): BookmarkGroup | undefined {
        if (currentGroup.id === id) {
            return currentGroup;
        }
        
        for (const childGroup of currentGroup.groups) {
            const result = this.findGroupByIdRecursive(childGroup, id);
            if (result) {
                return result;
            }
        }
        
        return undefined;
    }
    
    /**
     * Gets all groups (root and child groups)
     */
    getAllGroups(): BookmarkGroup[] {
        const allGroups: BookmarkGroup[] = [...this.groups];
        
        for (const group of this.groups) {
            allGroups.push(...this.getAllGroupsRecursive(group));
        }
        
        return allGroups;
    }
    
    /**
     * Recursively gets all child groups
     * 
     * @param group Group to get child groups from
     * @returns All child groups
     */
    private getAllGroupsRecursive(group: BookmarkGroup): BookmarkGroup[] {
        const groups: BookmarkGroup[] = [...group.groups];
        
        for (const childGroup of group.groups) {
            groups.push(...this.getAllGroupsRecursive(childGroup));
        }
        
        return groups;
    }
    
    /**
     * Gets all bookmarks (root and in groups)
     */
    getAllBookmarks(): Bookmark[] {
        const allBookmarks: Bookmark[] = [...this.bookmarks];
        
        for (const group of this.getAllGroups()) {
            allBookmarks.push(...group.bookmarks);
        }
        
        return allBookmarks;
    }
    
    /**
     * Moves a bookmark to a group
     * 
     * @param bookmarkId ID of the bookmark to move
     * @param targetGroupId ID of the target group
     * @returns true if the bookmark was moved, false otherwise
     */
    moveBookmarkToGroup(bookmarkId: string, targetGroupId: string): boolean {
        const bookmark = this.findBookmarkById(bookmarkId);
        const targetGroup = this.findGroupById(targetGroupId);
        
        if (!bookmark || !targetGroup) {
            return false;
        }
        
        // Remove bookmark from current location
        this.removeBookmark(bookmarkId);
        
        // Add to target group
        targetGroup.addBookmark(bookmark);
        
        this._onDidChangeData.fire();
        this.saveState();
        
        return true;
    }
    
    /**
     * Gets all bookmarks for a file
     * 
     * @param uri URI of the file
     * @returns Bookmarks for the file
     */
    getBookmarksForFile(uri: vscode.Uri): Bookmark[] {
        return this.getAllBookmarks().filter(bookmark => 
            bookmark.uri.toString() === uri.toString()
        );
    }
    
    /**
     * Checks if a file is bookmarked
     * 
     * @param uri URI of the file
     * @returns true if the file is bookmarked, false otherwise
     */
    isFileBookmarked(uri: vscode.Uri): boolean {
        return this.getBookmarksForFile(uri).length > 0;
    }
    
    /**
     * Exports bookmarks and groups to a JSON file
     * 
     * @returns JSON string with all bookmarks and groups
     */
    exportToJSON(): string {
        const data = {
            bookmarks: this.bookmarks.map(b => b.toJSON()),
            groups: this.groups.map(g => g.toJSON())
        };
        
        return JSON.stringify(data, null, 2);
    }
    
    /**
     * Imports bookmarks and groups from a JSON file
     * 
     * @param jsonData JSON string with bookmarks and groups
     * @param merge Whether to merge with existing bookmarks and groups
     * @returns true if import was successful, false otherwise
     */
    importFromJSON(jsonData: string, merge: boolean = false): boolean {
        try {
            const data = JSON.parse(jsonData);
            
            if (!merge) {
                this.bookmarks = [];
                this.groups = [];
            }
            
            // Import bookmarks
            if (data.bookmarks && Array.isArray(data.bookmarks)) {
                for (const bookmarkData of data.bookmarks) {
                    try {
                        const bookmark = Bookmark.fromJSON(bookmarkData);
                        this.bookmarks.push(bookmark);
                    } catch (error: unknown) {
                        console.error("Failed to import bookmark:", error);
                    }
                }
            }
            
            // Import groups
            if (data.groups && Array.isArray(data.groups)) {
                for (const groupData of data.groups) {
                    try {
                        const group = BookmarkGroup.fromJSON(groupData);
                        this.groups.push(group);
                    } catch (error: unknown) {
                        console.error("Failed to import group:", error);
                    }
                }
            }
            
            this._onDidChangeData.fire();
            this.saveState();
            
            return true;
        } catch (error: unknown) {
            console.error("Failed to import bookmarks:", error);
            return false;
        }
    }
    
    /**
     * Saves state to extension context
     */
    saveState(): void {
        const data = {
            bookmarks: this.bookmarks.map(b => b.toJSON()),
            groups: this.groups.map(g => g.toJSON())
        };
        
        this.context.globalState.update('tabBookmarks.data', data);
        
        // Optionally set this data for syncing
        if (vscode.workspace.getConfiguration('tabBookmarks').get('syncEnabled', true)) {
            this.context.globalState.setKeysForSync(['tabBookmarks.data']);
        }
    }
    
    /**
     * Loads state from extension context
     */
    loadState(): void {
        const data = this.context.globalState.get<any>('tabBookmarks.data');
        
        if (data) {
            try {
                // Load bookmarks
                if (data.bookmarks && Array.isArray(data.bookmarks)) {
                    this.bookmarks = data.bookmarks.map((bookmarkData: any) => 
                        Bookmark.fromJSON(bookmarkData)
                    );
                }
                
                // Load groups
                if (data.groups && Array.isArray(data.groups)) {
                    this.groups = data.groups.map((groupData: any) => 
                        BookmarkGroup.fromJSON(groupData)
                    );
                }
            } catch (error: unknown) {
                console.error("Failed to load bookmarks state:", error);
                vscode.window.showErrorMessage("Failed to load bookmarks. State may be corrupted.");
            }
        }
    }
}
