---
title: Create Local Database
description: Opens a local database and provides a connection reference.
---

## Purpose of the Node
This node is designed to open a local database and provide a connection reference as output. It checks if the database is already cached; if not, it creates a new database connection and caches it.

## Pins
| Pin Name | Pin Description | Pin Type | Value Type |
|:----------:|:-------------:|:------:|:------:|
| Start | Input signal to start the node | Execution | N/A |
| name | Table Name | Input | String |
| End | Output signal indicating the node has finished execution | Execution | N/A |
| database | Database Connection Reference | Output | Struct |