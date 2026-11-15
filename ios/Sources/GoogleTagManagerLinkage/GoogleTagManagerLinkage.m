#import "GoogleTagManagerLinkage.h"

// The Tag Manager SDK ships as a static archive, and nothing in an app calls it: TAGManager starts itself from +load and
// then follows Firebase Analytics. A linker takes an archive member only when something references a symbol it defines,
// and an app linked without -ObjC (Swift Package Manager adds none) therefore takes none of it. The archive's framework
// directory still lands in the bundle, so the build looks complete while the SDK, and with it the container, is absent.
//
// So every class the archive exports is referenced here. The SDK publishes no headers for them, which is why they are
// declared below, bare: the declarations only give the compiler a name, and each `[X class]` leaves an undefined
// `_OBJC_CLASS_$_X` that the linker must resolve from the archive. CocoaPods links with -ObjC anyway; this costs it nothing.
@interface TAGContainer : NSObject
@end
@interface TAGContainerLoader : NSObject
@end
@interface TAGDispatchScheduler : NSObject
@end
@interface TAGHit : NSObject
@end
@interface TAGHitSender : NSObject
@end
@interface TAGHitStore : NSObject
@end
@interface TAGJSExportedInstructions : NSObject
@end
@interface TAGLogger : NSObject
@end
@interface TAGManager : NSObject
@end
@interface TAGNetReachability : NSObject
@end
@interface TAGPendingEvent : NSObject
@end
@interface TAGRuntime : NSObject
@end
@interface TAGUniversalAnalytics : NSObject
@end

NSArray<NSString *> *GoogleTagManagerLinkedClassNames(void) {
    NSArray<Class> *classes = @[
        [TAGContainer class], [TAGContainerLoader class], [TAGDispatchScheduler class], [TAGHit class], [TAGHitSender class],
        [TAGHitStore class], [TAGJSExportedInstructions class], [TAGLogger class], [TAGManager class],
        [TAGNetReachability class], [TAGPendingEvent class], [TAGRuntime class], [TAGUniversalAnalytics class]
    ];
    NSMutableArray<NSString *> *names = [NSMutableArray arrayWithCapacity:classes.count];
    for (Class cls in classes) {
        [names addObject:NSStringFromClass(cls)];
    }
    return names;
}
