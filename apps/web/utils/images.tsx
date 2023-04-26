import classNames from "classnames";

export const HUMAN_PROFILE_IMAGE =
  "https://i.guim.co.uk/img/media/699cce4914b90ae0ba89787178bc48314d50eb89/0_215_5081_3048/master/5081.jpg?width=1200&height=1200&quality=85&auto=format&fit=crop&s=20e357d35de3b2adeb09c3b400520d39";

export const AI_PROFILE_IMAGE =
  "https://images.pexels.com/photos/2157888/pexels-photo-2157888.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2";

export enum profileImageSizes {
  SMALL,
  LARGE,
}
export function createHumanProfileFromName(
  name: string,
  size: profileImageSizes
) {
  let displayName = "";
  switch (size) {
    case profileImageSizes.LARGE:
      displayName = name.split(" ")[0].slice(0, 8);
      break;
    case profileImageSizes.SMALL:
      displayName = name[0];
      break;
    default:
      throw "Invalid image size";
  }

  return (
    <div
      className={classNames(
        "mb-5 flex items-center justify-center overflow-hidden rounded-full bg-amber-400 text-xl font-semibold text-amber-800",
        { "h-32 w-32": size === profileImageSizes.LARGE },
        { "h-12 w-12 min-w-[48px]": size === profileImageSizes.SMALL }
      )}
    >
      {displayName}
    </div>
  );
}
