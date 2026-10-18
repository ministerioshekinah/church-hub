/*
  Compatibility validation for cached older administrator bundles.
  Current admin.js owns verified publishing and editor locking. This handler
  defers to it when available; older bundles still require a confirmed row update.

  The script is loaded only on the admin page after the main admin bundle starts. It
  deliberately reuses admin.js's authenticated Supabase client instead of
  creating a second Auth client in the same browser tab.
*/
(function () {
  const button = document.getElementById("saveServiceButton");
  const status = document.getElementById("serviceDraftStatus");

  if (!button || !status) return;

  function formatServiceTime(timeValue) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeValue || "")) {
      throw new Error("Choose a valid service time before publishing.");
    }

    const [hoursString, minutesString] = timeValue.split(":");
    const hours24 = Number(hoursString);
    const minutes = Number(minutesString || "0");

    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
  }

  button.addEventListener(
    "click",
    async (event) => {
      // Current bundles own validation and editor locking. Retain this handler
      // only for compatibility with a cached older admin.js.
      if (typeof saveServiceChanges === "function") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const generation = adminSessionVersion;

      button.disabled = true;
      button.textContent = "Saving…";
      status.textContent = "";

      try {
        if (!supabaseClient) {
          throw new Error("Secure admin connection is not ready. Please refresh and try again.");
        }

        const { data: userData, error: userError } = await supabaseClient.auth.getUser();
        if (generation !== adminSessionVersion) return;
        const user = userData?.user;

        if (userError || !user || authenticatedAdmin?.id !== user.id) {
          throw new Error("Your admin session could not be verified. Please sign in again.");
        }

        const serviceTime = document.getElementById("serviceTimeInput").value;
        const payload = {
          day_en: document.getElementById("serviceDayEn").value.trim(),
          day_es: document.getElementById("serviceDayEs").value.trim(),
          service_label_en: document.getElementById("serviceLabelEn").value.trim(),
          service_label_es: document.getElementById("serviceLabelEs").value.trim(),
          service_time: serviceTime,
          time_display: formatServiceTime(serviceTime),
          special_message_en: document.getElementById("serviceMessageEn").value.trim(),
          special_message_es: document.getElementById("serviceMessageEs").value.trim(),
        };

        const { data: savedService, error } = await supabaseClient
          .from("service_settings")
          .update(payload)
          .eq("id", 1)
          .select("id")
          .maybeSingle();
        if (generation !== adminSessionVersion) return;

        if (error) throw error;
        if (savedService?.id !== 1) {
          throw new Error("The service row was not updated.");
        }

        status.textContent =
          "Published. The live website now uses these service settings.";
      } catch (error) {
        if (generation !== adminSessionVersion) return;
        console.error("Service publish verification failed:", error);
        status.textContent = `Could not publish service changes: ${
          error instanceof Error ? error.message : "unknown error"
        }`;
      } finally {
        button.disabled = false;
        button.textContent = "Save Service";
      }
    },
    { capture: true }
  );
})();
