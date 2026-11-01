package com.ghosted.operator;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import androidx.activity.result.ActivityResult;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Offline-only Android Storage Access Framework (SAF) backup.
 * Files live in a user-selected shared folder; uninstall removes private
 * SQLite and WebView storage, but NOT these external Documents files.
 * Access must be granted again after reinstall.
 */
@CapacitorPlugin(name = "GhostedLocalBackup")
public class GhostedLocalBackupPlugin extends Plugin {
    private static final String PREF_NAME = "ghosted_external_backups";
    private static final String PREF_TREE = "tree";
    private static final String PREF_SLOT = "slot";
    private static final String[] FILES = {"GHOSTED_BACKUP_A.json", "GHOSTED_BACKUP_B.json"};
    private static final int MAX_BYTES = 6 * 1024 * 1024;

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREF_NAME, 0);
    }

    private Uri selectedTree() {
        String text = prefs().getString(PREF_TREE, null);
        return text == null ? null : Uri.parse(text);
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject response = new JSObject();
        Uri uri = selectedTree();
        response.put("configured", uri != null);
        response.put("folder", uri == null ? "" : uri.toString());
        call.resolve(response);
    }

    @PluginMethod
    public void chooseFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "folderSelected");
    }

    @ActivityCallback
    private void folderSelected(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null
                || result.getData().getData() == null) {
            call.reject("Folder selection cancelled");
            return;
        }
        try {
            Uri uri = result.getData().getData();
            getContext().getContentResolver().takePersistableUriPermission(uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            prefs().edit().putString(PREF_TREE, uri.toString()).apply();
            JSObject response = new JSObject();
            response.put("configured", true);
            response.put("folder", uri.toString());
            call.resolve(response);
        } catch (Exception ex) {
            call.reject("Cannot access selected folder: " + ex.getMessage());
        }
    }

    private Uri documentRoot(Uri tree) {
        return DocumentsContract.buildDocumentUriUsingTree(tree,
                DocumentsContract.getTreeDocumentId(tree));
    }

    private Uri findBackup(Uri tree, String name) throws Exception {
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree,
                DocumentsContract.getTreeDocumentId(tree));
        try (Cursor cursor = getContext().getContentResolver().query(children,
                new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                        DocumentsContract.Document.COLUMN_DISPLAY_NAME}, null, null, null)) {
            if (cursor == null) throw new IllegalStateException("Folder cannot be listed");
            while (cursor.moveToNext()) {
                if (name.equals(cursor.getString(1))) {
                    return DocumentsContract.buildDocumentUriUsingTree(tree, cursor.getString(0));
                }
            }
        }
        return null;
    }

    private String readText(Uri uri) throws Exception {
        try (InputStream stream = getContext().getContentResolver().openInputStream(uri);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (stream == null) throw new IllegalStateException("Cannot open backup");
            byte[] buffer = new byte[8192];
            int count;
            while ((count = stream.read(buffer)) != -1) {
                if (output.size() + count > MAX_BYTES) throw new IllegalStateException("Backup exceeds size limit");
                output.write(buffer, 0, count);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }

    @PluginMethod
    public void readBackups(PluginCall call) {
        Uri tree = selectedTree();
        if (tree == null) { call.reject("Choose a backup folder first"); return; }
        JSObject response = new JSObject();
        try {
            for (int slot = 0; slot < 2; slot++) {
                Uri doc = findBackup(tree, FILES[slot]);
                if (doc != null) response.put("slot" + slot, readText(doc));
            }
            call.resolve(response);
        } catch (Exception ex) { call.reject("Cannot read backup folder: " + ex.getMessage()); }
    }

    @PluginMethod
    public void writeBackup(PluginCall call) {
        Uri tree = selectedTree();
        String payload = call.getString("payload");
        if (tree == null) { call.reject("Choose a backup folder first"); return; }
        if (payload == null || payload.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            call.reject("Invalid or oversized backup"); return;
        }
        try {
            // Alternate A/B. If a write is interrupted, the previous slot survives.
            int slot = 1 - prefs().getInt(PREF_SLOT, 1);
            Uri doc = findBackup(tree, FILES[slot]);
            if (doc == null) doc = DocumentsContract.createDocument(
                    getContext().getContentResolver(), documentRoot(tree),
                    "application/json", FILES[slot]);
            if (doc == null) throw new IllegalStateException("Cannot create backup file");
            try (OutputStream stream = getContext().getContentResolver().openOutputStream(doc, "wt")) {
                if (stream == null) throw new IllegalStateException("Cannot write backup file");
                stream.write(payload.getBytes(StandardCharsets.UTF_8));
                stream.flush();
            }
            String stored = readText(doc);
            if (!payload.equals(stored)) throw new IllegalStateException("Backup readback verification failed");
            prefs().edit().putInt(PREF_SLOT, slot).apply();
            JSObject response = new JSObject();
            response.put("ok", true);
            response.put("slot", slot);
            response.put("bytes", payload.getBytes(StandardCharsets.UTF_8).length);
            call.resolve(response);
        } catch (Exception ex) { call.reject("Backup could not be saved: " + ex.getMessage()); }
    }
}
