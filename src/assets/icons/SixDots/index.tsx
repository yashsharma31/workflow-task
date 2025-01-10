import { SVGProps } from "react";

const SixDots = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width={12}
      height={8}
      viewBox="0 0 12 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M1.364 4.364C.614 4.364 0 4.977 0 5.727s.614 1.364 1.364 1.364c.75 0 1.363-.614 1.363-1.364 0-.75-.613-1.363-1.363-1.363zM10.636 4.364c-.75 0-1.363.613-1.363 1.363s.613 1.364 1.363 1.364S12 6.477 12 5.727c0-.75-.614-1.363-1.364-1.363zM4.636 5.727c0-.75.614-1.363 1.364-1.363.75 0 1.364.613 1.364 1.363S6.75 7.091 6 7.091c-.75 0-1.364-.614-1.364-1.364zM1.364 0C.614 0 0 .614 0 1.364c0 .75.614 1.363 1.364 1.363.75 0 1.363-.613 1.363-1.363S2.114 0 1.364 0zM10.636 0c-.75 0-1.363.614-1.363 1.364 0 .75.613 1.363 1.363 1.363S12 2.114 12 1.364 11.386 0 10.636 0zM4.636 1.364C4.636.614 5.25 0 6 0c.75 0 1.364.614 1.364 1.364 0 .75-.614 1.363-1.364 1.363-.75 0-1.364-.613-1.364-1.363z"
        fill="#CDCDCD"
      />
    </svg>
  );
};

export default SixDots;
