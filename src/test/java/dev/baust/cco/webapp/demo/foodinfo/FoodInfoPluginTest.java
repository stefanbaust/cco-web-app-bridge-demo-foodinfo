package dev.baust.cco.webapp.demo.foodinfo;

import com.sap.scco.ap.plugin.annotation.ListenToExit;
import com.sap.scco.ap.plugin.annotation.ui.CSSInject;
import com.sap.scco.ap.plugin.annotation.ui.JSInject;
import com.sap.scco.ap.plugin.helper.PluginExitPoints;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.WriteListener;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import net.sf.json.JSONObject;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Tests the wiring this demo owns: the prefix it shares with the Angular app, the CCO exit
 * annotations the POS dispatches on, and the fact that the built webapp really ends up on the
 * plugin classpath. The bridge behaviour itself is covered in the bridge repository.
 */
class FoodInfoPluginTest {

    private static final String PREFIX = "FOODINFO";

    /** Plugin properties live in the CCO runtime, which is absent in unit tests. */
    private static class TestablePlugin extends FoodInfoPlugin {
        @Override
        public boolean getProperty(String key, boolean defaultValue) {
            return true;
        }
    }

    private static class CapturedResponse {
        final HttpServletResponse mock = mock(HttpServletResponse.class);
        final ByteArrayOutputStream body = new ByteArrayOutputStream();

        CapturedResponse() throws IOException {
            when(mock.getOutputStream()).thenReturn(new ServletOutputStream() {
                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setWriteListener(WriteListener writeListener) {
                }

                @Override
                public void write(int b) {
                    body.write(b);
                }
            });
        }

        String text() {
            return body.toString(StandardCharsets.UTF_8);
        }
    }

    private static HttpServletRequest requestFor(String action) {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getParameter("action")).thenReturn(action);
        return request;
    }

    private static String readAll(InputStream stream) throws IOException {
        try (InputStream in = stream) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    void identifiesItselfToTheCcoPluginManager() {
        FoodInfoPlugin plugin = new FoodInfoPlugin();

        assertEquals("FoodInfoPlugin", plugin.getId());
        assertEquals("Food Info Web App Bridge Plugin", plugin.getName());
    }

    @Test
    void injectsBridgeJsWithTheResolvedPrefix() throws Exception {
        InputStream[] injected = new FoodInfoPlugin().jsInject();

        assertEquals(1, injected.length, "the bridge JS must be injected exactly once");
        String js = readAll(injected[0]);
        assertFalse(js.contains("__PREFIX__"), "the prefix placeholder must be substituted");
        assertTrue(js.contains(PREFIX + "BridgePlugin"), "JS class must carry the plugin prefix");
    }

    /**
     * The Angular app derives its servlet actions and event names from BRIDGE_PREFIX. If that
     * constant and the prefix passed to the bridge in the Java constructor drift apart, the
     * webapp talks to a servlet action nobody serves — and the POS shows an empty card.
     */
    @Test
    void javaPrefixMatchesTheWebappBridgePrefix() throws Exception {
        String bridgeConfig = Files.readString(Path.of("webapp/src/app/shared/bridge-config.ts"));
        Matcher matcher = Pattern.compile("BRIDGE_PREFIX\\s*=\\s*'([^']+)'").matcher(bridgeConfig);
        assertTrue(matcher.find(), "BRIDGE_PREFIX not found in bridge-config.ts");

        String js = readAll(new FoodInfoPlugin().jsInject()[0]);
        assertTrue(js.contains(matcher.group(1) + "BridgePlugin"),
                "webapp prefix " + matcher.group(1) + " does not match the prefix used by the plugin");
    }

    @Test
    void doesNotInjectAnyCss() {
        assertEquals(0, new FoodInfoPlugin().cssInject().length);
    }

    /**
     * Guards the frontend-maven-plugin wiring: the Angular build has to land in
     * target/generated-resources/app so the bridge can serve it from the classpath.
     */
    @Test
    void servesTheBundledAngularAppAsIndexHtml() throws Exception {
        CapturedResponse response = new CapturedResponse();

        new TestablePlugin().pluginServletGet(null, new Object[]{requestFor(PREFIX + "Servlet"), response.mock});

        String html = response.text();
        assertTrue(html.contains("<app-root"), "index.html of the Angular app expected, got: " + html);
        assertTrue(html.contains("action=" + PREFIX + "Resource"),
                "asset URLs must be rewritten onto the plugin servlet");
    }

    @Test
    void reportsPluginConfigOverTheServlet() throws Exception {
        CapturedResponse response = new CapturedResponse();

        new TestablePlugin().pluginServletGet(null, new Object[]{requestFor(PREFIX + "Config"), response.mock});

        JSONObject config = JSONObject.fromObject(response.text());
        assertTrue(config.getBoolean("DEVMODE"));
        assertFalse(config.getBoolean("REMOTE"), "the demo bundles its webapp instead of proxying a dev server");
    }

    @Test
    void answersTheConfigRequestOnTheUiEventChannel() {
        Map<String, Object> responseMap = new HashMap<>();

        new TestablePlugin().uiEventChannel(null,
                new Object[]{PREFIX + "_GET_PLUGIN_CONFIG", null, new JSONObject(), responseMap});

        assertNotNull(responseMap.get("config"), "the webapp bootstraps on this response");
        assertFalse(responseMap.containsKey("error"));
    }

    @Test
    void ignoresEventsOfOtherPlugins() {
        Map<String, Object> responseMap = new HashMap<>();

        new TestablePlugin().uiEventChannel(null,
                new Object[]{"OTHER_GET_PLUGIN_CONFIG", null, new JSONObject(), responseMap});

        assertTrue(responseMap.isEmpty(), "prefixed events of other plugins must not be answered");
    }

    /**
     * CCO dispatches by annotation, so a typo in an exit name or a wrong parameter list fails
     * silently at runtime: the method is simply never called.
     */
    @Test
    void exposesTheExitsTheBridgeNeeds() throws Exception {
        assertExitPoint("pluginServletGet", "PluginServlet.callback.get");
        assertExitPoint("pluginServletPost", "PluginServlet.callback.post");
        assertExitPoint("uiEventChannel", PluginExitPoints.TECH_CONTROLLER_UI_EVENT_CHANNEL);

        Method jsInject = FoodInfoPlugin.class.getMethod("jsInject");
        assertEquals("NGUI", jsInject.getAnnotation(JSInject.class).targetScreen());
        Method cssInject = FoodInfoPlugin.class.getMethod("cssInject");
        assertEquals("NGUI", cssInject.getAnnotation(CSSInject.class).targetScreen());
    }

    private static void assertExitPoint(String methodName, String exitName) throws Exception {
        Method method = FoodInfoPlugin.class.getMethod(methodName, Object.class, Object[].class);
        ListenToExit annotation = method.getAnnotation(ListenToExit.class);
        assertNotNull(annotation, methodName + " must be annotated with @ListenToExit");
        assertEquals(exitName, annotation.exitName());
    }
}
