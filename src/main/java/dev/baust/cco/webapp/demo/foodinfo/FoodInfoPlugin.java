package dev.baust.cco.webapp.demo.foodinfo;

import com.sap.scco.ap.plugin.annotation.ListenToExit;
import com.sap.scco.ap.plugin.annotation.ui.CSSInject;
import com.sap.scco.ap.plugin.annotation.ui.JSInject;
import com.sap.scco.ap.plugin.helper.PluginExitPoints;
import dev.baust.cco.webapp.bridge.AbstractWebAppBridgePlugin;

import java.io.InputStream;

public class FoodInfoPlugin extends AbstractWebAppBridgePlugin {

    public FoodInfoPlugin() {
        super("FOODINFO");
    }

    @Override
    public String getId() {
        return "FoodInfoPlugin";
    }

    @Override
    public String getName() {
        return "Food Info Web App Bridge Plugin";
    }

    @JSInject(targetScreen = "NGUI")
    public InputStream[] jsInject() {
        return getBridgeJsInject();
    }

    @CSSInject(targetScreen = "NGUI")
    public InputStream[] cssInject() {
        return new InputStream[]{};
    }

    @ListenToExit(exitName = "PluginServlet.callback.get")
    public void pluginServletGet(Object caller, Object[] args) throws Exception {
        handleBridgeServletGet(caller, args);
    }

    @ListenToExit(exitName = "PluginServlet.callback.post")
    public void pluginServletPost(Object caller, Object[] args) throws Exception {
        handleBridgeServletPost(caller, args);
    }

    @ListenToExit(exitName = PluginExitPoints.TECH_CONTROLLER_UI_EVENT_CHANNEL)
    public void uiEventChannel(Object calledBy, Object[] args) {
        handleBridgeUiEventChannel(calledBy, args);
    }
}
