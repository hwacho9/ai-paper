import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { app } from "@/lib/firebase";

export const sendEvent = async (
    eventName: string,
    eventParams?: { [key: string]: any },
) => {
    if (app && (await isSupported())) {
        const analytics = getAnalytics(app);
        logEvent(analytics, eventName, eventParams);
        console.log(`Event logged: ${eventName}`, eventParams);
    }
};
