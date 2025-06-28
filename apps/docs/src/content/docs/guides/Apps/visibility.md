---
title: Visibility
description: A short explanation about the different project states.
---

![Overview](/guides/Apps/visibility.png)

Here's a Markdown-formatted guide description based on the diagram:

---

## App Visibility States Guide

This guide outlines the different visibility states an App can transition through, from development to production. Each state has its own rules regarding user access, review requirements, and visibility.

### 1. **Offline**

* **Description**: App is not accessible online. Does not count for your limits.
* **Note**: Transitioning *to* Private is *coming soon*.
* **Limit**: Max 1 user.

---

### 2. **Private**

* **Description**: App is in development. You might have limited amount of Private or Prototype Apps.
* **Access**: Only you!
* **Transition to**:
  * **Prototype**: For broader testing.
  * **Offline**: App becomes inaccessible again.

---

### 3. **Prototype**

* **Description**: Testing phase before going public.
* **Access**: Invite-only. Configurable user limits (On our version unlimited).
* **Transition to**:
  * **Private**: Removes all users.
  * **Public Request Join**: Requires review.
  * **Public**: Requires review.

---

### 4. **Public Request Join**

* **Description**: App is visible to everyone, users can request access.
* **Access**: Request-based.
* **Review**: Required to transition from Prototype.
* **Transition to**:
  * **Prototype**: Requires review.
  * **Public**: No additional review needed.

---

### 5. **Public**

* **Description**: App is fully public and can be joined by anyone.
* **Access**: Open to all, may involve payment.
* **Note**: Final production state.
* **Transition to**:
  * **Prototype**: Requires review.
  * **Public Request Join**: No additional review needed.
---

### Additional Notes

* **DEV vs PROD**:
  * **DEV**: Includes Offline, Private, Prototype.
  * **PROD**: Includes Public Request Join, Public.
* **User Access**:
  * Invite or review required for early stages.
  * Open access as app matures to production.

---

This visibility flow ensures controlled development, testing, and gradual rollout to a broader audience.