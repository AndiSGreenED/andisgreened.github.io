package de.andisgreened.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * ANDIsGREENed: native Ergänzungen der Android-App.
 * - intent://-Links (Windfinder-App) wie in Chrome auswerten, ohne Browser-Rückfall
 * - Textdatei speichern (Speicherort wählt der Nutzer) und als Datei teilen
 * - Versionsangaben der App
 */
@CapacitorPlugin(name = "AndisNative")
public class AndisNativePlugin extends Plugin {

    @Override
    public Boolean shouldOverrideLoad(Uri url) {
        if (url != null && "intent".equalsIgnoreCase(url.getScheme())) {
            launchIntentUri(url.toString());
            return true; // nie im WebView laden
        }
        return null; // alles andere wie gewohnt
    }

    private boolean launchIntentUri(String uri) {
        try {
            Intent intent = Intent.parseUri(uri, Intent.URI_INTENT_SCHEME);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            intent.setComponent(null);
            intent.setSelector(null);
            getActivity().startActivity(intent);
            return true;
        } catch (ActivityNotFoundException e) {
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void openIntent(PluginCall call) {
        String url = call.getString("url");
        JSObject ret = new JSObject();
        ret.put("opened", url != null && url.startsWith("intent:") && launchIntentUri(url));
        call.resolve(ret);
    }

    @PluginMethod
    public void saveText(PluginCall call) {
        if (call.getString("text") == null) {
            call.reject("Kein Inhalt");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(call.getString("mimeType", "application/json"));
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("filename", "ANDIsGREENed.json"));
        startActivityForResult(call, intent, "saveTextResult");
    }

    @ActivityCallback
    private void saveTextResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject ret = new JSObject();
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            ret.put("saved", false);
            call.resolve(ret);
            return;
        }
        try (OutputStream os = getContext().getContentResolver().openOutputStream(data.getData(), "wt")) {
            if (os == null) throw new IllegalStateException("Ziel nicht beschreibbar");
            os.write(call.getString("text", "").getBytes(StandardCharsets.UTF_8));
            ret.put("saved", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Speichern fehlgeschlagen: " + e.getMessage());
        }
    }

    @PluginMethod
    public void shareFile(PluginCall call) {
        String text = call.getString("text");
        if (text == null) {
            call.reject("Kein Inhalt");
            return;
        }
        try {
            File dir = new File(getContext().getCacheDir(), "teilen");
            if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Ordner nicht anlegbar");
            String name = call.getString("filename", "ANDIsGREENed.json").replaceAll("[^A-Za-z0-9._-]", "_");
            File file = new File(dir, name);
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(text.getBytes(StandardCharsets.UTF_8));
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(call.getString("mimeType", "application/json"));
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.putExtra(Intent.EXTRA_SUBJECT, call.getString("title", "ANDIsGREENed"));
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(send, call.getString("title", "Teilen"));
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject("Teilen fehlgeschlagen: " + e.getMessage());
        }
    }

    @PluginMethod
    public void appInfo(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            ret.put("versionName", info.versionName);
            @SuppressWarnings("deprecation")
            long code = Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
            ret.put("versionCode", code);
        } catch (Exception e) {
            ret.put("versionName", "");
        }
        call.resolve(ret);
    }
}
