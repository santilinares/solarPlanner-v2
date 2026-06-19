// =====================================================
// DEPRECATED: This custom preset is no longer in use
// =====================================================
// The app now uses pure Aura baseline (see app.config.ts).
// This file is preserved for reference. If you need to customize
// PrimeNG tokens, rebuild this preset incrementally on top of Aura.
// =====================================================

import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';

export const SolarPreset = definePreset(Aura, {
  primitive: {
    green: {
      50: '#E8F5F0',
      100: '#D1F4E0',
      200: '#95D5B2',
      300: '#74C69D',
      400: '#52B788',
      500: '#2D6A4F',
      600: '#1B4332',
      700: '#081C15',
      800: '#041910',
      900: '#020C08',
      950: '#010604'
    },
    yellow: {
      50: '#FFFEF0',
      100: '#FFFBD6',
      200: '#FFF9AD',
      300: '#FFF684',
      400: '#FFE84D',
      500: '#FFD600',
      600: '#D6B400',
      700: '#AD9200',
      800: '#847000',
      900: '#5C4E00',
      950: '#5C4E00'
    },
    blue: {
      500: '#219EBC'
    }
  },
  semantic: {
    primary: {
      50: '{green.50}',
      100: '{green.100}',
      200: '{green.200}',
      300: '{green.300}',
      400: '{green.400}',
      500: '{green.500}',
      600: '{green.600}',
      700: '{green.700}',
      800: '{green.800}',
      900: '{green.900}',
      950: '{green.950}'
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#F0F7F4',
          100: '#D1F4E0',
          200: '#95D5B2',
          300: '#74C69D',
          400: '#52B788',
          500: '#2D6A4F',
          600: '#1B4332',
          700: '#081C15',
          800: '#041910',
          900: '#020C08',
          950: '#010604'
        },
        primary: {
          color: '{green.500}',
          contrastColor: '#FFFFFF',
          hoverColor: '{green.600}',
          activeColor: '{green.700}'
        },
        formField: {
          background: '#FFFFFF',
          borderColor: '#B7E4C7',
          focusBorderColor: '{green.500}',
          hoverBorderColor: '#B7E4C7',
          color: '#000000',
          placeholderColor: '#52B788',
          invalidBorderColor: '#D62828',
          invalidPlaceholderColor: '#D62828'
        }
      },
      dark: {
        surface: {
          0: '#1B4332',
          50: '#081C15',
          100: '#1B4332',
          200: '#2D6A4F',
          300: '#40916C',
          400: '#52B788',
          500: '#74C69D',
          600: '#95D5B2',
          700: '#B7E4C7',
          800: '#D1F4E0',
          900: '#E8F5F0',
          950: '#F0F7F4'
        },
        primary: {
          color: '#625898',
          contrastColor: '#081C15',
          hoverColor: '#52B788',
          activeColor: '#74C69D'
        },
        formField: {
          background: '#1B4332',
          borderColor: '#2D6A4F',
          focusBorderColor: '#40916C',
          hoverBorderColor: '#40916C',
          color: '#B7E4C7',
          placeholderColor: '#74C69D',
          invalidBorderColor: '#FF5757',
          invalidPlaceholderColor: '#FF5757'
        }
      }
    },
    formField: {
      paddingX: '0.75rem',
      paddingY: '0.85rem',
      sm: {
        fontSize: '0.875rem',
        paddingX: '0.625rem',
        paddingY: '0.375rem'
      },
      lg: {
        fontSize: '1.125rem',
        paddingX: '0.875rem',
        paddingY: '0.625rem'
      },
      borderRadius: '{extend.solar.radius.lg}',
      focusRing: {
        width: '0',
        style: 'none',
        color: 'transparent',
        offset: '0',
        shadow: '0 0 0 0.2rem color-mix(in srgb, {prim}, transparent 70%)'
      },
      transitionDuration: '0.25s'
    },
    focusRing: {
      width: '2px',
      style: 'dashed',
      color: '{primary.color}',
      offset: '2px'
    }
  },
  extend: {
    solar: {
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem'
      },
      radius: {
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '2.5rem',
        '3xl': '3rem',
        full: '9999px'
      },
      shadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        solar: '0 0 15px rgba(255, 214, 0, 0.4)',
        solarStrong: '0 0 30px rgba(255, 214, 0, 0.6)'
      },
      transition: {
        fast: '150ms ease-in-out',
        base: '250ms ease-in-out',
        slow: '350ms ease-in-out'
      },
      zIndex: {
        base: '0',
        raised: '10',
        dropdown: '100',
        sticky: '200',
        overlay: '400',
        modal: '600',
        toast: '800',
        tooltip: '1000'
      }
    }
  },
  components: {
    button: {
      root: {
        borderRadius: '{extend.solar.radius.md}',
        paddingX: '1.75rem',
        paddingY: '0.875rem',
        transitionDuration: '0.25s',
        label: {
          fontWeight: '600'
        }
      },
      colorScheme: {
        light: {
          root: {
            warn: {
              background: '{yellow.500}',
              hoverBackground: '{yellow.600}',
              activeBackground: '{yellow.700}',
              borderColor: '{yellow.500}',
              hoverBorderColor: '{yellow.600}',
              activeBorderColor: '{yellow.700}',
              color: '#000000',
              hoverColor: '#000000',
              activeColor: '#000000'
            }
          }
        },
        dark: {
          root: {
            warn: {
              background: '{yellow.500}',
              hoverBackground: '{yellow.600}',
              activeBackground: '{yellow.700}',
              borderColor: '{yellow.500}',
              hoverBorderColor: '{yellow.600}',
              activeBorderColor: '{yellow.700}',
              color: '#000000',
              hoverColor: '#000000',
              activeColor: '#000000'
            }
          }
        }
      }
    },
    inputtext: {
      root: {
        borderRadius: '{extend.solar.radius.lg}'
      }
    },
    select: {
      overlay: {
        borderRadius: '{extend.solar.radius.lg}',
        shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }
    },
    card: {
      root: {
        borderRadius: '{extend.solar.radius.lg}',
      },

      body: {
        padding: '1.5rem'
      },
      title: {
        fontSize: '1.5rem',
        fontWeight: '600'
      },
      colorScheme: {
        light: {
          root: {
            background: '{surface.0}',
            color: '#081C15',
            shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px #B7E4C7'
          },
          subtitle: {
            color: '#40916C'
          }
        },
        dark: {
          root: {
            background: '{surface.0}',
            color: '#B7E4C7',
            shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.25), 0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 0 0 1px #2D6A4F'
          },
          subtitle: {
            color: '#95D5B2'
          }
        }
      }
    },
    datatable: {
      header: {
        background: '{primary.color}',
        borderColor: '{primary.color}',
        color: '{primary.contrast.color}'
      },
      headerCell: {
        background: '{primary.color}',
        borderColor: '{primary.color}',
        color: '{primary.contrast.color}',
        hoverBackground: '{primary.hover.color}',
        hoverColor: '{primary.contrast.color}'
      },
      row: {
        hoverBackground: '{surface.100}'
      },
      colorScheme: {
        light: {
          root: {
            borderColor: '{surface.200}'
          },
          row: {
            stripedBackground: '{surface.50}'
          }
        },
        dark: {
          root: {
            borderColor: '{surface.800}'
          },
          row: {
            stripedBackground: '{surface.950}'
          }
        }
      }
    },
    skeleton: {
      root: {
        borderRadius: '{content.border.radius}'
      },
      colorScheme: {
        light: {
          root: {
            background: '{surface.200}',
            animationBackground: 'rgba(255,255,255,0.4)'
          }
        },
        dark: {
          root: {
            background: 'rgba(255, 255, 255, 0.06)',
            animationBackground: 'rgba(255, 255, 255, 0.04)'
          }
        }
      }
    },
    message: {
      root: {
        borderRadius: '{content.border.radius}',
        borderWidth: '1px',
        transitionDuration: '{transition.duration}'
      },
      content: {
        padding: '0.5rem 0.75rem',
        gap: '0.5rem'
      },
      text: {
        fontSize: '1rem',
        fontWeight: '500'
      },
      icon: {
        size: '1.125rem'
      },
      closeButton: {
        width: '1.75rem',
        height: '1.75rem',
        borderRadius: '{extend.solar.radius.lg}',
        focusRing: {
          width: '{focus.ring.width}',
          style: '{focus.ring.style}',
          offset: '{focus.ring.offset}'
        }
      },
      closeIcon: {
        size: '1rem'
      },
      colorScheme: {
        light: {
          info: {
            background: 'color-mix(in srgb, {blue.50}, transparent 5%)',
            borderColor: '#48CAE4',
            color: '#219EBC',
            closeButton: {
              hoverBackground: '#D4F1F9'
            }
          },
          success: {
            background: 'color-mix(in srgb, {green.50}, transparent 5%)',
            borderColor: '{green.200}',
            color: '{green.600}',
            closeButton: {
              hoverBackground: '{green.100}'
            }
          },
          warn: {
            background: 'color-mix(in srgb, {yellow.50}, transparent 5%)',
            borderColor: '{yellow.200}',
            color: '{yellow.600}',
            closeButton: {
              hoverBackground: '{yellow.100}'
            }
          },
          error: {
            background: 'color-mix(in srgb, #FF6B6B, transparent 5%)',
            borderColor: '#FF8787',
            color: '#D62828',
            closeButton: {
              hoverBackground: '#FFE0E0'
            }
          },
          secondary: {
            background: '{surface.100}',
            borderColor: '{surface.200}',
            color: '{surface.600}',
            closeButton: {
              hoverBackground: '{surface.200}'
            }
          }
        },
        dark: {
          info: {
            background: 'color-mix(in srgb, {blue.500}, transparent 84%)',
            borderColor: '#48CAE4',
            color: '{blue.500}',
            closeButton: {
              hoverBackground: 'rgba(255, 255, 255, 0.05)'
            }
          },
          success: {
            background: 'color-mix(in srgb, {green.500}, transparent 84%)',
            borderColor: '#40916C',
            color: '{green.500}',
            closeButton: {
              hoverBackground: 'rgba(255, 255, 255, 0.05)'
            }
          },
          warn: {
            background: 'color-mix(in srgb, {yellow.500}, transparent 84%)',
            borderColor: '#FFD600',
            color: '{yellow.500}',
            closeButton: {
              hoverBackground: 'rgba(255, 255, 255, 0.05)'
            }
          },
          error: {
            background: 'color-mix(in srgb, #FF6B6B, transparent 84%)',
            borderColor: '#FF6B6B',
            color: '#FF6B6B',
            closeButton: {
              hoverBackground: 'rgba(255, 255, 255, 0.05)'
            }
          },
          secondary: {
            background: '{surface.800}',
            borderColor: '{surface.700}',
            color: '{surface.300}',
            closeButton: {
              hoverBackground: '{surface.700}'
            }
          }
        }
      }
    },
    menubar: {
      root: {
        background: '{content.background}',
        borderColor: '{content.border.color}',
        borderRadius: '{content.border.radius}',
        color: '{content.color}',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        transitionDuration: '{transition.duration}'
      },
      baseItem: {
        borderRadius: '{content.border.radius}',
        padding: '{navigation.item.padding}'
      },
      item: {
        padding: '{navigation.item.padding}',
        borderRadius: '{navigation.item.border.radius}',
        gap: '{navigation.item.gap}'
      },
      submenu: {
        padding: '{navigation.list.padding}',
        gap: '{navigation.list.gap}',
        background: '{content.background}',
        borderColor: '{content.border.color}',
        borderRadius: '{content.border.radius}',
        shadow: '{overlay.navigation.shadow}'
      },
      separator: {
        borderColor: '{content.border.color}'
      },
      mobileButton: {
        borderRadius: '50%',
        size: '1.75rem',
        color: '{text.muted.color}',
        hoverColor: '{text.hover.muted.color}',
        hoverBackground: '{content.hover.background}',
        focusRing: {
          width: '{focus.ring.width}',
          style: '{focus.ring.style}',
          color: '{focus.ring.color}',
          offset: '{focus.ring.offset}',
          shadow: '{focus.ring.shadow}'
        }
      }
    },
    password: {
      meter: {
        background: '{content.border.color}',
        borderRadius: '{content.border.radius}',
        height: '0.75rem'
      },
      icon: {
        color: '{form.field.icon.color}'
      },
      overlay: {
        background: '{overlay.popover.background}',
        borderColor: '{overlay.popover.border.color}',
        borderRadius: '{overlay.popover.border.radius}',
        color: '{overlay.popover.color}',
        padding: '{overlay.popover.padding}',
        shadow: '{overlay.popover.shadow}'
      },
      content: {
        gap: '0.5rem'
      },
      colorScheme: {
        light: {
          strength: {
            weakBackground: '#D62828',
            mediumBackground: '#F77F00',
            strongBackground: '{green.500}'
          }
        },
        dark: {
          strength: {
            weakBackground: '#FF6B6B',
            mediumBackground: '#FFA94D',
            strongBackground: '{green.400}'
          }
        }
      }
    },
    dataview: {
      root: {
        borderColor: 'transparent',
        borderWidth: '0',
        borderRadius: '0',
        padding: '0'
      },
      header: {
        background: '{content.background}',
        color: '{content.color}',
        borderColor: '{content.border.color}',
        borderWidth: '0 0 1px 0',
        padding: '0.75rem 1rem',
        borderRadius: '0'
      },
      content: {
        background: '{content.background}',
        color: '{content.color}',
        borderColor: 'transparent',
        borderWidth: '0',
        padding: '0',
        borderRadius: '0'
      },
      footer: {
        background: '{content.background}',
        color: '{content.color}',
        borderColor: '{content.border.color}',
        borderWidth: '1px 0 0 0',
        padding: '0.75rem 1rem',
        borderRadius: '0'
      },
      paginatorTop: {
        borderColor: '{content.border.color}',
        borderWidth: '0 0 1px 0'
      },
      paginatorBottom: {
        borderColor: '{content.border.color}',
        borderWidth: '1px 0 0 0'
      }
    },
    tag: {
      root: {
        fontSize: '0.875rem',
        fontWeight: '700',
        padding: '0.25rem 0.5rem',
        gap: '0.25rem',
        borderRadius: '{content.border.radius}',
        roundedBorderRadius: '{border.radius.xl}'
      },
      icon: {
        size: '0.75rem'
      },
      colorScheme: {
        light: {
          primary: {
            background: '{primary.100}',
            color: '{primary.700}'
          },
          secondary: {
            background: '{surface.100}',
            color: '{surface.600}'
          },
          success: {
            background: '{green.100}',
            color: '{green.700}'
          },
          info: {
            background: '#D4F1F9',
            color: '#219EBC'
          },
          warn: {
            background: '{yellow.100}',
            color: '{yellow.700}'
          },
          danger: {
            background: '#FFE0E0',
            color: '#D62828'
          },
          contrast: {
            background: '{surface.950}',
            color: '{surface.0}'
          }
        },
        dark: {
          primary: {
            background: 'color-mix(in srgb, {primary.500}, transparent 84%)',
            color: '{primary.300}'
          },
          secondary: {
            background: '{surface.800}',
            color: '{surface.300}'
          },
          success: {
            background: 'color-mix(in srgb, {green.500}, transparent 84%)',
            color: '{green.300}'
          },
          info: {
            background: 'color-mix(in srgb, {blue.500}, transparent 84%)',
            color: '#48CAE4'
          },
          warn: {
            background: 'color-mix(in srgb, {yellow.500}, transparent 84%)',
            color: '{yellow.300}'
          },
          danger: {
            background: 'color-mix(in srgb, #FF6B6B, transparent 84%)',
            color: '#FF8787'
          },
          contrast: {
            background: '{surface.0}',
            color: '{surface.950}'
          }
        }
      }
    }
  }
});
