import express, { Request, Response } from "express";
import {
  updateUserDisplayNameRequest,
  updateUserPasswordRequest,
} from "@baselinedocs/shared";
import { supabase } from "../lib/supabase.js";
import * as bcrypt from "bcrypt";

export async function updateUserDisplayName(
  req: Request<{}, {}, updateUserDisplayNameRequest>,
  res: Response
) {
  const { user_id, new_displayName } = req.body;
  if (user_id === undefined || new_displayName === undefined) {
    req.log.info(`Request missing required keys`);
    return res.sendStatus(400);
  }

  const { error } = await supabase
    .from("users")
    .update({ name: new_displayName })
    .eq("user_id", user_id);

  if (error) {
    req.log.error(error);
    return res.sendStatus(500);
  }

  res.sendStatus(200);
}

export async function updateUserPassword(
  req: Request<{}, {}, updateUserPasswordRequest>,
  res: Response
) {
  const { user_id, current_password, new_password } = req.body;

  if (
    user_id === undefined ||
    current_password === undefined ||
    new_password === undefined
  ) {
    req.log.info(`Request missing required keys`);
    return res.sendStatus(400);
  }
  const { data, error } = await supabase
    .from("users")
    .select("password")
    .eq("user_id", user_id)
    .maybeSingle();

  if (error || !data) {
    req.log.error(error);
    return res.sendStatus(500);
  }

  const passwordMatch = await bcrypt.compare(current_password, data.password);

  if (passwordMatch) {
    const hashedPassword = await bcrypt.hash(new_password, 10);
    const { error } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("user_id", user_id);

    if (error) {
      req.log.error(error);
      return res.sendStatus(500);
    }

    req.log.info(`Password successfully changed for: ${user_id}`);
    res.sendStatus(200);
  } else {
    req.log.info(
      `${user_id} tried to update password with an invalid current password`
    );
    res.sendStatus(403);
  }
}
