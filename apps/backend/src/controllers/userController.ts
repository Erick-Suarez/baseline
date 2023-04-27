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
  const request = req.body;
  console.log(request);
  const { error } = await supabase
    .from("users")
    .update({ name: request.new_displayName })
    .eq("user_id", request.user_id);

  if (error) {
    console.error(error);
    return res.sendStatus(500);
  }

  res.sendStatus(200);
}

export async function updateUserPassword(
  req: Request<{}, {}, updateUserPasswordRequest>,
  res: Response
) {
  const request = req.body;

  const { data, error } = await supabase
    .from("users")
    .select("password")
    .eq("user_id", request.user_id)
    .maybeSingle();

  if (error || !data) {
    console.error(error);
    return res.sendStatus(500);
  }

  const passwordMatch = await bcrypt.compare(
    request.current_password,
    data.password
  );

  if (passwordMatch) {
    const hashedPassword = await bcrypt.hash(request.new_password, 10);
    const { error } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("user_id", request.user_id);

    if (error) {
      console.error(error);
      return res.sendStatus(500);
    }

    console.log(`Password successfully changed for: ${request.user_id}`);
    res.sendStatus(200);
  } else {
    console.log(
      `${request.user_id} tried to update password with an invalid current password`
    );
    res.sendStatus(403);
  }
}
